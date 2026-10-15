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
          <!-- data-text reserva a largura do negrito: a aba não "pula" ao ser selecionada. -->
          <span class="label" [attr.data-text]="tab.label">{{ tab.label }}</span
          >&ngsp;
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
      font-weight: var(--fw-body);
      white-space: nowrap;
      transition: color var(--transition-fast);
    }
    button:hover {
      color: var(--text-primary);
    }
    button[aria-selected='true'] {
      color: var(--text-primary);
      font-weight: var(--fw-strong);
      border-bottom-color: var(--text-primary);
    }
    button:focus-visible {
      outline-offset: -2px;
      border-radius: var(--radius-sm);
    }
    .label {
      display: inline-flex;
      flex-direction: column;
    }
    .label::after {
      content: attr(data-text);
      height: 0;
      overflow: hidden;
      visibility: hidden;
      font-weight: var(--fw-strong);
    }
    /* Contador como rótulo neutro: fio cinza-esverdeado, raio 2, sem fundo. */
    .count {
      min-width: 20px;
      padding: 0 5px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: var(--fw-body);
      font-variant-numeric: tabular-nums;
      line-height: 16px;
      text-align: center;
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
