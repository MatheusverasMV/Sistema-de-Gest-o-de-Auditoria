import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

export type KpiTone = 'neutral' | 'warning' | 'danger';

@Component({
  selector: 'sga-kpi-card',
  imports: [Icon],
  template: `
    <div class="top">
      <span class="label">{{ label() }}</span>
      @if (icon()) {
        <span class="icon"><sga-icon [name]="icon()!" [size]="18" /></span>
      }
    </div>
    @if (loading()) {
      <span class="skeleton" aria-label="Carregando"></span>
    } @else {
      <span class="value">{{ value() }}</span>
    }
    @if (hint()) {
      <span class="meta hint">{{ hint() }}</span>
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
      box-shadow: var(--shadow-sm);
      min-width: 0;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
    }
    .label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }
    .icon {
      display: inline-flex;
      padding: 6px;
      border-radius: var(--radius-md);
      background: var(--green-50);
      color: var(--green-700);
    }
    :host(.kpi--warning) .icon {
      background: var(--warning-100);
      color: var(--warning-700);
    }
    :host(.kpi--danger) .icon {
      background: var(--danger-100);
      color: var(--danger-700);
    }
    .value {
      font-size: 28px;
      font-weight: 600;
      line-height: 1.2;
      letter-spacing: -0.02em;
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
