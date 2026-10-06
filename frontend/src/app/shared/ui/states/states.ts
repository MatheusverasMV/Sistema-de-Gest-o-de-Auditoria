import { Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'sga-empty-state',
  imports: [Icon],
  template: `
    <span class="icon" [class.icon--danger]="tone() === 'danger'">
      <sga-icon [name]="icon()" [size]="22" />
    </span>
    <h3 class="title">{{ heading() }}</h3>
    @if (description()) {
      <p class="description">{{ description() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  host: { '[attr.role]': "tone() === 'danger' ? 'alert' : null", '[class.compact]': 'compact()' },
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-8) var(--space-6);
      text-align: center;
    }
    :host(.compact) {
      padding: var(--space-5) var(--space-4);
    }
    .icon {
      display: inline-flex;
      padding: var(--space-3);
      margin-bottom: var(--space-1);
      border-radius: 50%;
      background: var(--green-50);
      color: var(--green-700);
    }
    .icon--danger {
      background: var(--danger-100);
      color: var(--danger-700);
    }
    .title {
      font-size: 15px;
      font-weight: 600;
    }
    .description {
      max-width: 440px;
      color: var(--text-secondary);
    }
    .actions {
      display: flex;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }
    .actions:empty {
      display: none;
    }
  `,
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly icon = input('inbox');
  readonly tone = input<'neutral' | 'danger'>('neutral');
  readonly compact = input(false);
}

@Component({
  selector: 'sga-loading-state',
  template: `
    @for (row of rowsArray(); track $index) {
      <span class="bar" [style.width.%]="row"></span>
    }
    <span class="sr-only">{{ label() }}</span>
  `,
  host: { role: 'status', 'aria-live': 'polite' },
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5);
    }
    .bar {
      height: 14px;
      border-radius: var(--radius-sm);
      background: linear-gradient(
        90deg,
        var(--surface-sunken) 0%,
        var(--surface-muted) 50%,
        var(--surface-sunken) 100%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    @keyframes shimmer {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: -100% 0;
      }
    }
  `,
})
export class LoadingState {
  readonly label = input('Carregando…');
  readonly rows = input(4);

  protected rowsArray(): number[] {
    return Array.from({ length: this.rows() }, (_, i) => [92, 76, 84, 64, 88][i % 5]);
  }
}
