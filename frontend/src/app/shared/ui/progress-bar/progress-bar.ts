import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'sga-progress-bar',
  template: `
    <div
      class="track"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="clamped()"
      [attr.aria-label]="label()"
    >
      <div class="fill" [style.width.%]="clamped()"></div>
    </div>
    @if (showValue()) {
      <span class="value mono">{{ clamped() }}%</span>
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 80px;
    }
    .track {
      flex: 1;
      height: 6px;
      border-radius: var(--radius-pill);
      background: var(--green-100);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      border-radius: inherit;
      background: var(--green-700);
      transition: width 300ms ease;
    }
    .value {
      min-width: 36px;
      text-align: right;
      font-size: var(--fs-meta);
      color: var(--text-secondary);
    }
  `,
})
export class ProgressBar {
  readonly value = input.required<number>();
  readonly label = input('Progresso');
  readonly showValue = input(true);

  protected readonly clamped = computed(() => Math.round(Math.min(100, Math.max(0, this.value()))));
}
