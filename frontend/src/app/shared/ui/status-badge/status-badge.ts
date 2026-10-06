import { Component, input } from '@angular/core';
import { StatusTone } from '../../../core/models';

@Component({
  selector: 'sga-status-badge',
  template: `<span class="dot" aria-hidden="true"></span>{{ label() }}`,
  host: { '[class]': "'badge badge--' + tone()" },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 22px;
      padding: 0 var(--space-2);
      border-radius: var(--radius-pill);
      font-size: var(--fs-meta);
      font-weight: 500;
      white-space: nowrap;
      line-height: 1;
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
    :host(.badge--neutral) {
      background: var(--neutral-100);
      color: var(--neutral-700);
    }
    :host(.badge--info) {
      background: var(--info-100);
      color: var(--info-700);
    }
    :host(.badge--warning) {
      background: var(--warning-100);
      color: var(--warning-700);
    }
    :host(.badge--danger) {
      background: var(--danger-100);
      color: var(--danger-700);
    }
    :host(.badge--success) {
      background: var(--success-100);
      color: var(--success-700);
    }
    :host(.badge--brand) {
      background: var(--green-950);
      color: var(--green-100);
    }
  `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<StatusTone>('neutral');
}
