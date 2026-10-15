import { Component, input } from '@angular/core';

/**
 * Superfície básica. Cabeçalho opcional com título/subtítulo e
 * ações projetadas via atributo `card-actions`.
 */
@Component({
  selector: 'sga-card',
  template: `
    @if (heading()) {
      <header class="card__header">
        <div class="card__titles">
          <h2 class="card-title" [id]="headingId">{{ heading() }}</h2>
          @if (subheading()) {
            <p class="card__subtitle">{{ subheading() }}</p>
          }
        </div>
        <div class="card__actions"><ng-content select="[card-actions]" /></div>
      </header>
    }
    <div class="card__body" [class.card__body--flush]="flush()">
      <ng-content />
    </div>
  `,
  host: {
    '[attr.role]': "heading() ? 'region' : null",
    '[attr.aria-labelledby]': 'heading() ? headingId : null',
  },
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-5) 0;
    }
    .card__titles {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .card__subtitle {
      font-size: var(--fs-small);
      color: var(--text-secondary);
    }
    .card__actions {
      display: flex;
      gap: var(--space-2);
      flex-shrink: 0;
    }
    .card__actions:empty {
      display: none;
    }
    .card__body {
      flex: 1;
      min-width: 0;
      padding: var(--space-4) var(--space-5) var(--space-5);
    }
    .card__body--flush {
      padding: var(--space-3) 0 0;
    }
    /* Sem cabeçalho, o conteúdo de borda a borda (ex.: tabela) começa no topo do card. */
    .card__body--flush:first-child {
      padding-top: 0;
    }
  `,
})
export class Card {
  private static nextId = 0;

  readonly heading = input<string>();
  readonly subheading = input<string>();
  /** Remove o padding do corpo (útil para tabelas e listas de borda a borda). */
  readonly flush = input(false);

  protected readonly headingId = `sga-card-${++Card.nextId}`;
}
