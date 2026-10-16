import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlChartData, ControlChartPoint } from '../../../core/models';
import { Icon } from '../../../shared/ui';

const MARGIN = { top: 28, right: 84, bottom: 32, left: 52 };
const MIN_LABEL_SPACING = 52;
const MIN_VALUE_LABEL_SPACING = 40;
const LIMIT_LABEL_GAP = 13;
const TOOLTIP_WIDTH = 260;
/** Largura mínima legível da carta; abaixo dela a área do gráfico rola na horizontal. */
const MIN_CHART_WIDTH = 320;
const TOOLTIP_GAP = 12;

interface PlotPoint extends ControlChartPoint {
  readonly x: number;
  readonly y: number;
}

type Marker = 'critical' | 'attention' | 'info' | 'normal';

/**
 * Renderização SVG de uma carta de controle (série + LC + LSC/LIC). Não calcula
 * estatística: recebe pontos já processados por `control-limits.ts`. O conteúdo
 * contextual do tooltip vem dos próprios pontos (`facts`, `detail`), sem regra
 * específica de métrica aqui.
 */
@Component({
  selector: 'sga-control-chart',
  imports: [Icon],
  templateUrl: './control-chart.html',
  styleUrl: './control-chart.scss',
})
export class ControlChart {
  readonly data = input.required<ControlChartData>();
  /** Formato curto: eixo, rótulos de limite (ex.: "4,2 d", "12,5%"). */
  readonly format = input.required<(value: number) => string>();
  /** Formato do valor no tooltip e na tabela acessível; padrão = `format`. */
  readonly valueFormat = input<(value: number) => string>();
  readonly label = input.required<string>();
  /** Prefixo do rótulo do ponto no tooltip ("Mês"); vazio quando o rótulo já se explica. */
  readonly periodLabel = input('Período');
  readonly height = input(280);
  /** Ponto destacado (ex.: aberto no drill-down). */
  readonly selectedId = input<string | null>(null);

  /** Clique, Enter ou Espaço sobre um ponto. */
  readonly pointSelect = output<ControlChartPoint>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly width = signal(720);
  protected readonly margin = MARGIN;
  protected readonly hovered = signal<number | null>(null);
  /** O espaço disponível é menor que a largura mínima: a carta rola localmente. */
  protected readonly scrollable = signal(false);

  constructor() {
    const observer = new ResizeObserver(([entry]) => {
      const available = Math.floor(entry.contentRect.width);
      this.width.set(Math.max(MIN_CHART_WIDTH, available));
      this.scrollable.set(available < MIN_CHART_WIDTH);
    });
    observer.observe(this.host.nativeElement);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  protected readonly tooltipValue = computed(() => this.valueFormat() ?? this.format());

  private readonly innerWidth = computed(() => this.width() - MARGIN.left - MARGIN.right);
  private readonly innerHeight = computed(() => this.height() - MARGIN.top - MARGIN.bottom);

  /**
   * Domínio Y: inclui zero, valores observados, linha central e todos os limites.
   * Suporta valores e limites negativos (ex.: desvio de horas).
   */
  protected readonly yTicks = computed(() => {
    const { points, center } = this.data();
    const values = points.flatMap((p) => [p.value, p.ucl, p.lcl]);
    let min = Math.min(0, center, ...values);
    let max = Math.max(0, center, ...values);
    if (max === min) {
      max = min + 1;
    }
    const pad = (max - min) * 0.08;
    max += pad;
    if (min < 0) {
      min -= pad;
    }
    const step = niceStep((max - min) / 4);
    const first = Math.floor(min / step + 1e-9);
    const last = Math.ceil(max / step - 1e-9);
    const ticks: number[] = [];
    for (let k = first; k <= last; k++) {
      ticks.push(Number((k * step).toFixed(10)) || 0);
    }
    return ticks;
  });

  private readonly yMin = computed(() => this.yTicks()[0]);
  private readonly yMax = computed(() => this.yTicks()[this.yTicks().length - 1]);

  protected y(value: number): number {
    const span = this.yMax() - this.yMin() || 1;
    return MARGIN.top + this.innerHeight() * (1 - (value - this.yMin()) / span);
  }

  /** Linha de referência em zero quando o domínio cruza o zero. */
  protected readonly zeroY = computed(() => (this.yMin() < 0 ? this.y(0) : null));

  protected readonly plot = computed<PlotPoint[]>(() => {
    const { points } = this.data();
    const stepX = points.length > 1 ? this.innerWidth() / (points.length - 1) : 0;
    const offset = points.length > 1 ? 0 : this.innerWidth() / 2;
    return points.map((p, i) => ({
      ...p,
      x: MARGIN.left + offset + i * stepX,
      y: this.y(p.value),
    }));
  });

  protected readonly linePath = computed(() =>
    this.plot()
      .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(''),
  );

  /** Limites em degraus: constantes na carta I, variáveis por período nas cartas p e u. */
  protected readonly uclPath = computed(() => this.stepPath((p) => p.ucl));
  protected readonly lclPath = computed(() => this.stepPath((p) => p.lcl));
  protected readonly centerY = computed(() => this.y(this.data().center));

  /** Rótulos LSC/LC/LIC à direita, afastados entre si quando os valores são próximos. */
  protected readonly limitLabels = computed(() => {
    const last = this.plot()[this.plot().length - 1];
    if (!last) {
      return [];
    }
    const labels = [
      { key: 'ucl', text: `LSC ${this.format()(last.ucl)}`, y: this.y(last.ucl), strong: false },
      {
        key: 'center',
        text: `LC ${this.format()(this.data().center)}`,
        y: this.centerY(),
        strong: true,
      },
      { key: 'lcl', text: `LIC ${this.format()(last.lcl)}`, y: this.y(last.lcl), strong: false },
    ];
    for (let i = 1; i < labels.length; i++) {
      labels[i].y = Math.max(labels[i].y, labels[i - 1].y + LIMIT_LABEL_GAP);
    }
    const overflow = labels[labels.length - 1].y - (this.height() - MARGIN.bottom);
    if (overflow > 0) {
      labels.forEach((l) => (l.y -= overflow));
    }
    return labels;
  });

  /** Fronteira entre o período de referência da baseline e o período monitorado. */
  protected readonly phaseBoundary = computed(() => {
    const plot = this.plot();
    const index = plot.findIndex((p) => p.phase === 'monitoring');
    if (index <= 0 || !plot.some((p) => p.phase === 'reference')) {
      return null;
    }
    return (plot[index - 1].x + plot[index].x) / 2;
  });

  protected readonly xLabels = computed(() => {
    const labels: { x: number; text: string }[] = [];
    let lastX = -Infinity;
    for (const p of this.plot()) {
      const text = p.axisLabel ?? p.label;
      if (text && p.x - lastX >= MIN_LABEL_SPACING) {
        labels.push({ x: p.x, text });
        lastX = p.x;
      }
    }
    return labels;
  });

  /**
   * Pontos fora de controle que recebem rótulo de valor. Vizinhos muito próximos não
   * repetem o rótulo (o valor segue no tooltip e na tabela acessível).
   */
  protected readonly valueLabels = computed(() => {
    const ids = new Set<string>();
    let lastX = -Infinity;
    for (const p of this.plot()) {
      if (p.outOfControl && p.x - lastX >= MIN_VALUE_LABEL_SPACING) {
        ids.add(p.id);
        lastX = p.x;
      }
    }
    return ids;
  });

  protected readonly legend = computed(() => {
    // A legenda deriva do mesmo marker() que desenha os pontos: só lista o que aparece.
    const markers = new Set(this.data().points.map((p) => this.marker(p)));
    return {
      signal: markers.has('critical'),
      attention: markers.has('attention'),
      info: markers.has('info'),
      reference: this.phaseBoundary() !== null,
    };
  });

  protected readonly active = computed(() => {
    const index = this.hovered();
    return index === null ? null : this.plot()[index];
  });

  /**
   * Tooltip ao lado do ponto, sem cobrir a coluna de rótulos LSC/LC/LIC à direita: abre para a
   * direita quando cabe antes dessa coluna; senão, para a esquerda. Sempre dentro da carta.
   */
  protected readonly tooltipLeft = computed(() => {
    const point = this.active();
    if (!point) {
      return 0;
    }
    const plotRight = this.width() - MARGIN.right;
    const right = point.x + TOOLTIP_GAP;
    const left = right + TOOLTIP_WIDTH <= plotRight ? right : point.x - TOOLTIP_GAP - TOOLTIP_WIDTH;
    return Math.min(Math.max(left, 0), this.width() - TOOLTIP_WIDTH);
  });

  protected readonly hitWidth = computed(() => {
    const n = this.data().points.length;
    return n > 1 ? this.innerWidth() / (n - 1) : this.innerWidth();
  });

  protected marker(point: ControlChartPoint): Marker {
    if (point.flag) {
      return point.flag;
    }
    return point.outOfControl ? 'critical' : 'normal';
  }

  /** Losango para causa especial, círculo para os demais: o sinal não depende só da cor. */
  protected diamond(p: PlotPoint, r: number): string {
    return `M${p.x},${p.y - r}L${p.x + r},${p.y}L${p.x},${p.y + r}L${p.x - r},${p.y}Z`;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const last = this.data().points.length - 1;
    const current = this.hovered();
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        event.preventDefault();
        const delta = event.key === 'ArrowRight' ? 1 : -1;
        this.hovered.set(
          current === null ? (delta > 0 ? 0 : last) : Math.min(last, Math.max(0, current + delta)),
        );
        break;
      }
      case 'Home':
      case 'End':
        event.preventDefault();
        this.hovered.set(event.key === 'Home' ? 0 : last);
        break;
      case 'Enter':
      case ' ':
        if (current !== null) {
          event.preventDefault();
          this.select(current);
        }
        break;
      case 'Escape':
        this.hovered.set(null);
        break;
    }
  }

  protected select(index: number): void {
    const point = this.data().points[index];
    if (point) {
      this.pointSelect.emit(point);
    }
  }

  protected statusText(point: ControlChartPoint): string {
    if (point.value > point.ucl) return 'Fora de controle · acima do LSC';
    if (point.value < point.lcl) return 'Fora de controle · abaixo do LIC';
    if (point.flag === 'attention' || point.flag === 'info')
      return 'Dentro dos limites · padrão a observar';
    return 'Dentro dos limites';
  }

  private stepPath(accessor: (p: ControlChartPoint) => number): string {
    const plot = this.plot();
    if (!plot.length) {
      return '';
    }
    const half = plot.length > 1 ? (plot[1].x - plot[0].x) / 2 : 0;
    return plot
      .map((p, i) => {
        const y = this.y(accessor(p)).toFixed(1);
        const x0 = i === 0 ? p.x : p.x - half;
        const x1 = i === plot.length - 1 ? p.x : p.x + half;
        return `${i ? 'L' : 'M'}${x0.toFixed(1)},${y}L${x1.toFixed(1)},${y}`;
      })
      .join('');
  }
}

function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}
