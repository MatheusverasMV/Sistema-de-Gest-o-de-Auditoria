import { Component, effect, input, output, signal } from '@angular/core';
import { ControlChartData, ControlChartPoint, QualitySignal } from '../../../core/models';
import { Button } from '../../../shared/ui';
import { ControlChart } from '../control-chart/control-chart';

export interface ChartPointSelection {
  readonly chart: QualitySignal['chart'];
  readonly point: ControlChartPoint;
}

/**
 * Par I-MR. A carta de indivíduos (nível do processo) fica sempre visível; a de
 * amplitude móvel (variabilidade entre observações consecutivas) abre sob demanda,
 * para manter a leitura executiva.
 */
@Component({
  selector: 'sga-imr-panel',
  imports: [ControlChart, Button],
  template: `
    <sga-control-chart
      [data]="individuals()"
      [format]="format()"
      [valueFormat]="valueFormat()"
      [label]="label()"
      periodLabel=""
      [selectedId]="selected()?.chart === 'primary' ? selected()!.id : null"
      (pointSelect)="pointSelect.emit({ chart: 'primary', point: $event })"
    />

    <div class="mr-toggle">
      <button
        sgaButton
        type="button"
        size="sm"
        variant="ghost"
        [icon]="expanded() ? 'chevron-down' : 'chevron-right'"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="panelId"
        (click)="expanded.set(!expanded())"
      >
        {{ expanded() ? 'Ocultar variabilidade' : 'Ver variabilidade' }}
        @if (mrSignals() > 0) {
          <span class="mr-badge">{{ mrSignals() }} sinal{{ mrSignals() > 1 ? 'is' : '' }}</span>
        }
      </button>
    </div>

    <div [id]="panelId" [hidden]="!expanded()">
      @if (expanded()) {
        <p class="mr-intro">
          <strong>Amplitude móvel (MR)</strong> · diferença entre cada observação e a anterior. O
          nível médio pode continuar normal enquanto o processo fica mais irregular; pontos acima do
          LSC indicam esse aumento de variabilidade.
        </p>
        <sga-control-chart
          [data]="movingRange()"
          [format]="format()"
          [valueFormat]="valueFormat()"
          [label]="'Amplitude móvel — ' + label()"
          periodLabel=""
          [height]="210"
          [selectedId]="selected()?.chart === 'moving-range' ? selected()!.id : null"
          (pointSelect)="pointSelect.emit({ chart: 'moving-range', point: $event })"
        />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .mr-toggle {
      margin-top: var(--space-3);
    }
    .mr-badge {
      margin-left: var(--space-1);
      padding: 0 6px;
      border-radius: var(--radius-sm);
      background: var(--warning-100);
      color: var(--warning-700);
      font-size: 11px;
      line-height: 18px;
    }
    .mr-intro {
      margin: var(--space-3) 0;
      font-size: 13px;
      color: var(--text-secondary);
    }
  `,
})
export class ImrPanel {
  private static nextId = 0;

  readonly individuals = input.required<ControlChartData>();
  readonly movingRange = input.required<ControlChartData>();
  readonly format = input.required<(value: number) => string>();
  readonly valueFormat = input<(value: number) => string>();
  readonly label = input.required<string>();
  /** Número de sinais detectados na carta MR, exibido no botão. */
  readonly mrSignals = input(0);
  readonly selected = input<{ chart: QualitySignal['chart']; id: string } | null>(null);
  protected readonly expanded = signal(false);

  readonly pointSelect = output<ChartPointSelection>();

  protected readonly panelId = `sga-imr-mr-${++ImrPanel.nextId}`;

  constructor() {
    // Detalhar um ponto da MR (ex.: a partir de um sinal de variabilidade) revela a carta.
    effect(() => {
      if (this.selected()?.chart === 'moving-range') {
        this.expanded.set(true);
      }
    });
  }
}
