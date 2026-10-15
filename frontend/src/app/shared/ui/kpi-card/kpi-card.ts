import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

export type KpiTone = 'neutral' | 'warning' | 'danger';

/**
 * Indicador tipográfico: o número é o protagonista. O ícone fica pequeno e sem bloco ao lado do
 * rótulo; o tom vira um marcador junto ao valor, sempre acompanhado do rótulo e da dica (nunca só cor).
 */
@Component({
  selector: 'sga-kpi-card',
  imports: [Icon],
  template: `
    <div class="top">
      <span class="label">{{ label() }}</span>
      @if (icon()) {
        <sga-icon class="icon" [name]="icon()!" [size]="16" />
      }
    </div>
    @if (loading()) {
      <span class="skeleton" aria-label="Carregando"></span>
    } @else {
      <span class="value-line">
        @if (tone() !== 'neutral') {
          <span class="marker" aria-hidden="true"></span>
        }
        <span class="value">{{ value() }}</span>
      </span>
    }
    @if (hint()) {
      <span class="hint">{{ hint() }}</span>
    }
  `,
  host: { '[class]': "'kpi kpi--' + tone()" },
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-4) var(--space-5);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      min-width: 0;
    }
    .top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-2);
    }
    .label {
      font-size: var(--fs-small);
      color: var(--text-secondary);
    }
    .icon {
      margin-top: 1px;
      color: var(--text-secondary);
    }
    :host(.kpi--warning) .icon {
      color: var(--warning-700);
    }
    :host(.kpi--danger) .icon {
      color: var(--danger-700);
    }
    .value-line {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }
    .value {
      font-size: var(--fs-kpi);
      font-weight: var(--fw-display);
      font-variant-numeric: tabular-nums;
      line-height: 1.2;
      color: var(--text-primary);
    }
    .marker {
      flex-shrink: 0;
      width: 8px;
      height: 8px;
      border-radius: 1px;
    }
    :host(.kpi--warning) .marker {
      background: var(--warning-500);
      box-shadow: inset 0 0 0 1px var(--warning-700);
    }
    :host(.kpi--danger) .marker {
      background: var(--danger-500);
    }
    .skeleton {
      display: block;
      width: 64px;
      height: 34px;
      border-radius: var(--radius-sm);
      background: var(--surface-sunken);
    }
    .hint {
      overflow: hidden;
      font-size: var(--fs-meta);
      color: var(--text-secondary);
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input<string | number>('');
  readonly hint = input<string>();
  readonly icon = input<string>();
  readonly tone = input<KpiTone>('neutral');
  readonly loading = input(false);
}
