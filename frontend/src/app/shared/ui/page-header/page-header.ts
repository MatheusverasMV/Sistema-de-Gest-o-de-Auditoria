import { Component, input } from '@angular/core';
import { Breadcrumb, BreadcrumbItem } from '../breadcrumb/breadcrumb';

@Component({
  selector: 'sga-page-header',
  imports: [Breadcrumb],
  template: `
    @if (breadcrumb().length) {
      <sga-breadcrumb [items]="breadcrumb()" />
    }
    <div class="row">
      <div class="titles">
        <div class="title-line">
          <h1 class="page-title">{{ heading() }}</h1>
          <ng-content select="[header-badge]" />
        </div>
        @if (subheading()) {
          <p class="subtitle">{{ subheading() }}</p>
        }
        <ng-content select="[header-meta]" />
      </div>
      <div class="actions"><ng-content select="[header-actions]" /></div>
    </div>
  `,
  // Título dominante (ExtraBold 28, verde-escuro), subtítulo discreto e ações alinhadas à base do
  // título. Sem fundo nem fio: a hierarquia vem só da tipografia e do espaçamento.
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--space-3) var(--space-4);
    }
    .titles {
      display: flex;
      flex: 1 1 320px;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 0;
    }
    .title-line {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
    }
    .page-title {
      color: var(--text-primary);
      overflow-wrap: anywhere;
    }
    .subtitle {
      max-width: 72ch;
      color: var(--text-secondary);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .actions:empty {
      display: none;
    }
  `,
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly subheading = input<string>();
  readonly breadcrumb = input<readonly BreadcrumbItem[]>([]);
}
