import { Component, ElementRef, input, model, viewChildren } from '@angular/core';

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
}

/**
 * Lista de abas acessível (padrão WAI-ARIA tabs com ativação automática).
 * O conteúdo é renderizado pelo componente pai a partir de `selected`.
 */
@Component({
  selector: 'sga-tabs',
  template: `
    <div role="tablist" [attr.aria-label]="label()" (keydown)="onKeydown($event)">
      @for (tab of tabs(); track tab.id) {
        <button
          #tabButton
          type="button"
          role="tab"
          [id]="'tab-' + tab.id"
          [attr.aria-selected]="tab.id === selected()"
          [attr.aria-controls]="panelId()"
          [tabIndex]="tab.id === selected() ? 0 : -1"
          (click)="selected.set(tab.id)"
        >
          {{ tab.label }}
          @if (tab.count !== undefined) {
            <span class="count">{{ tab.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    [role='tablist'] {
      display: flex;
      gap: var(--space-1);
      border-bottom: 1px solid var(--border);
      overflow-x: auto;
      scrollbar-width: thin;
    }
    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: var(--space-2) var(--space-3) 10px;
      border: 0;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      background: none;
      color: var(--text-secondary);
      font-weight: 500;
      white-space: nowrap;
      transition: color var(--transition-fast);
    }
    button:hover {
      color: var(--text-primary);
    }
    button[aria-selected='true'] {
      color: var(--green-700);
      border-bottom-color: var(--green-700);
    }
    button:focus-visible {
      outline-offset: -2px;
      border-radius: var(--radius-sm);
    }
    .count {
      padding: 0 6px;
      border-radius: var(--radius-pill);
      background: var(--surface-sunken);
      font-size: 11px;
      line-height: 18px;
      color: var(--text-secondary);
    }
  `,
})
export class Tabs {
  readonly tabs = input.required<readonly TabItem[]>();
  readonly selected = model.required<string>();
  readonly label = input('Seções');
  readonly panelId = input<string>();

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  protected onKeydown(event: KeyboardEvent): void {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) {
      return;
    }
    event.preventDefault();
    const tabs = this.tabs();
    const current = tabs.findIndex((t) => t.id === this.selected());
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    this.selected.set(tabs[next].id);
    this.buttons()[next]?.nativeElement.focus();
  }
}
