import { Component, computed, input, output } from '@angular/core';
import { QualitySignal } from '../../../core/models';
import { Card, EmptyState, Icon } from '../../../shared/ui';
import { ControlChart } from '../control-chart/control-chart';
import { ChartPointSelection, ImrPanel } from '../imr-panel/imr-panel';
import { MetricAnalysis } from '../quality-analysis';
import {
  describeBaseline,
  describeInsufficiency,
  SEVERITY_META,
  worstSeverity,
} from '../quality-ui';

/** Um indicador do MVP: leitura gerencial primeiro, carta e detalhes técnicos em seguida. */
@Component({
  selector: 'sga-quality-metric-card',
  imports: [Card, ControlChart, ImrPanel, EmptyState, Icon],
  template: `
    @let a = analysis();
    @let d = a.definition;
    <sga-card [heading]="d.title" [subheading]="d.question">
      <span card-actions class="method" [title]="d.methodNote">{{ d.methodLabel }}</span>

      <div class="summary">
        <span [class]="'status status--' + status().tone">
          <sga-icon [name]="status().icon" [size]="14" />{{ status().label }}
        </span>
        @if (latest(); as l) {
          <span class="latest">
            Último: <strong>{{ d.formatLong(l.value) }}</strong>
            <span class="meta">&nbsp;({{ l.label }}) · LC {{ d.formatLong(a.chart!.center) }}</span>
          </span>
        }
      </div>
      <p class="definition meta">{{ d.definition }}</p>

      @if (a.chart) {
        @if (a.movingRange) {
          <sga-imr-panel
            [individuals]="a.chart"
            [movingRange]="a.movingRange"
            [format]="d.format"
            [valueFormat]="d.formatLong"
            [label]="d.chartLabel"
            [mrSignals]="mrSignalCount()"
            [selected]="selected()"
            (pointSelect)="pointSelect.emit($event)"
          />
        } @else {
          <sga-control-chart
            [data]="a.chart"
            [format]="d.format"
            [valueFormat]="d.formatLong"
            [label]="d.chartLabel"
            [periodLabel]="d.pointPrefix"
            [selectedId]="selected()?.chart === 'primary' ? selected()!.id : null"
            (pointSelect)="pointSelect.emit({ chart: 'primary', point: $event })"
          />
        }
        <p class="baseline meta"><sga-icon name="database" [size]="13" />{{ baselineText() }}</p>
      } @else {
        <sga-empty-state
          [compact]="true"
          icon="hourglass"
          heading="Dados insuficientes para limites de controle"
          [description]="insufficiencyText()"
        />
      }

      <details class="method-note">
        <summary>Como esta carta é calculada</summary>
        <p class="meta">{{ d.methodNote }}</p>
      </details>
    </sga-card>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    sga-card {
      height: 100%;
    }
    .method {
      padding: 2px var(--space-2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      white-space: nowrap;
      cursor: help;
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px var(--space-2);
      border-radius: var(--radius-sm);
      font-size: var(--fs-meta);
      font-weight: 600;
    }
    .status--danger {
      background: var(--danger-100);
      color: var(--danger-700);
    }
    .status--warning {
      background: var(--warning-100);
      color: var(--warning-700);
    }
    .status--info {
      background: var(--info-100);
      color: var(--info-700);
    }
    .status--success {
      background: var(--success-100);
      color: var(--success-700);
    }
    .status--neutral {
      background: var(--neutral-100);
      color: var(--neutral-700);
    }
    .latest {
      font-size: 13px;
    }
    .definition {
      margin: var(--space-2) 0 var(--space-3);
    }
    .baseline {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin-top: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px solid var(--border);
    }
    .baseline sga-icon {
      margin-top: 2px;
    }
    .method-note {
      margin-top: var(--space-3);
      font-size: 13px;
    }
    .method-note summary {
      cursor: pointer;
      color: var(--text-secondary);
      width: fit-content;
    }
    .method-note p {
      margin-top: var(--space-2);
    }
  `,
})
export class QualityMetricCard {
  readonly analysis = input.required<MetricAnalysis>();
  readonly selected = input<{ chart: QualitySignal['chart']; id: string } | null>(null);
  readonly pointSelect = output<ChartPointSelection>();

  protected readonly status = computed(() => {
    const a = this.analysis();
    if (!a.chart) {
      return { label: 'Coletando dados', icon: 'hourglass', tone: 'neutral' };
    }
    const worst = worstSeverity(a.signals);
    if (!worst) {
      return { label: 'Sob controle', icon: 'circle-check', tone: 'success' };
    }
    const count = a.signals.length;
    const meta = SEVERITY_META[worst];
    return {
      label: `${meta.label} · ${count} sina${count > 1 ? 'is' : 'l'}`,
      icon: meta.icon,
      tone: meta.tone,
    };
  });

  protected readonly latest = computed(() => {
    const points = this.analysis().chart?.points ?? [];
    return points[points.length - 1] ?? null;
  });

  protected readonly mrSignalCount = computed(
    () => this.analysis().signals.filter((s) => s.chart === 'moving-range').length,
  );

  protected readonly baselineText = computed(() =>
    describeBaseline(this.analysis().baseline, this.analysis().definition),
  );

  protected readonly insufficiencyText = computed(() =>
    describeInsufficiency(this.analysis().baseline, this.analysis().definition),
  );
}
