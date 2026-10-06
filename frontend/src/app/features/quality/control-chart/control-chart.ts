import { Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';
import { ControlChartData, ControlChartPoint } from '../../../core/models';
import { Icon } from '../../../shared/ui';

const HEIGHT = 280;
const MARGIN = { top: 20, right: 64, bottom: 32, left: 48 };
const MIN_LABEL_SPACING = 52;

interface PlotPoint extends ControlChartPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Renderização SVG de uma carta de controle (série + LC + LSC/LIC). Não calcula
 * estatística: recebe pontos já processados por `control-limits.ts`.
 */
@Component({
  selector: 'sga-control-chart',
  imports: [Icon],
  templateUrl: './control-chart.html',
  styleUrl: './control-chart.scss',
})
export class ControlChart {
  readonly data = input.required<ControlChartData>();
  /** Formata valores do eixo, rótulos e tooltip (ex.: "4,2 d", "12,5%"). */
  readonly format = input.required<(value: number) => string>();
  readonly label = input.required<string>();
  readonly periodLabel = input('Período');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly width = signal(720);
  protected readonly height = HEIGHT;
  protected readonly margin = MARGIN;
  protected readonly hovered = signal<number | null>(null);

  constructor() {
    const observer = new ResizeObserver(([entry]) =>
      this.width.set(Math.max(320, Math.floor(entry.contentRect.width))),
    );
    observer.observe(this.host.nativeElement);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  private readonly innerWidth = computed(() => this.width() - MARGIN.left - MARGIN.right);
  private readonly innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

  protected readonly yTicks = computed(() => {
    const { points } = this.data();
    const max = Math.max(...points.map((p) => Math.max(p.value, p.ucl))) * 1.1;
    const step = niceStep(max / 4);
    const ticks: number[] = [];
    for (let v = 0; v <= max + step * 0.01; v += step) {
      ticks.push(v);
    }
    if (ticks[ticks.length - 1] < max) {
      ticks.push(ticks[ticks.length - 1] + step);
    }
    return ticks;
  });

  private readonly yMax = computed(() => this.yTicks()[this.yTicks().length - 1] || 1);

  protected y(value: number): number {
    return MARGIN.top + this.innerHeight - (value / this.yMax()) * this.innerHeight;
  }

  protected readonly plot = computed<PlotPoint[]>(() => {
    const { points } = this.data();
    const stepX = points.length > 1 ? this.innerWidth() / (points.length - 1) : 0;
    return points.map((p, i) => ({ ...p, x: MARGIN.left + i * stepX, y: this.y(p.value) }));
  });

  protected readonly linePath = computed(() =>
    this.plot()
      .map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(''),
  );

  /** Limites em degraus: constantes na carta I, variáveis por período na carta p. */
  protected readonly uclPath = computed(() => this.stepPath((p) => p.ucl));
  protected readonly lclPath = computed(() => this.stepPath((p) => p.lcl));
  protected readonly centerY = computed(() => this.y(this.data().center));

  protected readonly lastUcl = computed(() => this.plot()[this.plot().length - 1]?.ucl ?? 0);
  protected readonly lastLcl = computed(() => this.plot()[this.plot().length - 1]?.lcl ?? 0);
  protected readonly hasLcl = computed(() => this.data().points.some((p) => p.lcl > 0));

  protected readonly xLabelEvery = computed(() => {
    const n = this.data().points.length;
    return Math.max(1, Math.ceil(n / Math.max(1, this.innerWidth() / MIN_LABEL_SPACING)));
  });

  protected readonly signals = computed(() => this.data().points.filter((p) => p.outOfControl));

  protected readonly active = computed(() => {
    const index = this.hovered();
    return index === null ? null : this.plot()[index];
  });

  protected readonly tooltipLeft = computed(() => {
    const point = this.active();
    if (!point) {
      return 0;
    }
    const tooltipWidth = 240;
    return Math.min(Math.max(point.x - tooltipWidth / 2, 0), this.width() - tooltipWidth);
  });

  protected readonly hitWidth = computed(() => {
    const n = this.data().points.length;
    return n > 1 ? this.innerWidth() / (n - 1) : this.innerWidth();
  });

  protected onKeydown(event: KeyboardEvent): void {
    const last = this.data().points.length - 1;
    const current = this.hovered();
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      this.hovered.set(
        current === null ? (delta > 0 ? 0 : last) : Math.min(last, Math.max(0, current + delta)),
      );
    } else if (event.key === 'Escape') {
      this.hovered.set(null);
    }
  }

  protected statusText(point: ControlChartPoint): string {
    if (point.value > point.ucl) return 'Fora de controle · acima do LSC';
    if (point.value < point.lcl) return 'Fora de controle · abaixo do LIC';
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
