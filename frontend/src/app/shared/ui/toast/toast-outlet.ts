import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { IconButton } from '../button/button';
import { Icon } from '../icon/icon';

const TONE_ICON = { success: 'circle-check', info: 'info', danger: 'circle-alert' } as const;

@Component({
  selector: 'sga-toast-outlet',
  imports: [Icon, IconButton],
  template: `
    <div class="stack" role="status" aria-live="polite">
      @for (toast of service.toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.tone">
          <sga-icon [name]="icons[toast.tone]" [size]="18" />
          <span class="message">{{ toast.message }}</span>
          <button
            sgaIconButton
            size="sm"
            type="button"
            icon="x"
            label="Dispensar"
            (click)="service.dismiss(toast.id)"
          ></button>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      right: var(--space-6);
      bottom: var(--space-6);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      max-width: 420px;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
      border-radius: var(--radius-md);
      background: var(--green-950);
      color: #fff;
      box-shadow: var(--shadow-lg);
      animation: rise 160ms ease-out;
    }
    .toast--success sga-icon {
      color: var(--accent);
    }
    .toast--danger {
      background: var(--danger-700);
    }
    .message {
      flex: 1;
    }
    /* Especificidade acima do .btn--ghost compartilhado, que usaria texto escuro sobre o toast. */
    .toast button {
      color: var(--text-on-brand);
    }
    .toast button:hover {
      background: rgb(241 242 236 / 12%);
      color: var(--text-on-brand);
    }
    @keyframes rise {
      from {
        transform: translateY(8px);
        opacity: 0;
      }
    }
  `,
})
export class ToastOutlet {
  protected readonly service = inject(ToastService);
  protected readonly icons = TONE_ICON;
}
