import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  BreadcrumbItem,
  Button,
  Card,
  EmptyState,
  Icon,
  LoadingState,
  PageHeader,
} from '../../shared/ui';
import { AutomationService } from './automation.service';
import { SampleSelectionWizard } from './sample-selection/sample-selection-wizard';

@Component({
  selector: 'sga-automation-run-page',
  imports: [
    RouterLink,
    PageHeader,
    Card,
    EmptyState,
    LoadingState,
    Button,
    Icon,
    SampleSelectionWizard,
  ],
  template: `
    @if (automation.isLoading()) {
      <sga-card><sga-loading-state [rows]="5" /></sga-card>
    } @else if (automation.value(); as a) {
      <div class="page">
        <sga-page-header
          [heading]="a.name"
          [subheading]="a.description"
          [breadcrumb]="breadcrumb()"
        >
          <span header-badge class="category"
            ><sga-icon [name]="a.icon" [size]="14" />{{ a.category }}</span
          >
        </sga-page-header>

        @if (a.available) {
          <sga-sample-selection-wizard [workpaperId]="workpaperId()" />
        } @else {
          <sga-card>
            <sga-empty-state
              heading="Execução prevista para a próxima versão"
              description="Neste protótipo apenas a Seleção de Amostras possui fluxo de execução completo. Esta automação já está catalogada com entradas e categoria definidas."
              icon="hourglass"
            >
              <a sgaButton routerLink="/automations" icon="arrow-left">Voltar à central</a>
              <a
                sgaButton
                variant="primary"
                routerLink="/automations/sample-selection"
                icon="shuffle"
                >Ver Seleção de Amostras</a
              >
            </sga-empty-state>
          </sga-card>
        }
      </div>
    } @else {
      <sga-card>
        <sga-empty-state heading="Automação não encontrada" icon="zap">
          <a sgaButton variant="primary" routerLink="/automations"
            >Ir para a Central de Automações</a
          >
        </sga-empty-state>
      </sga-card>
    }
  `,
  styles: `
    .category {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px var(--space-2);
      border-radius: var(--radius-pill);
      background: var(--green-100);
      color: var(--green-800);
      font-size: var(--fs-meta);
      font-weight: 500;
    }
  `,
})
export default class AutomationRunPage {
  private readonly service = inject(AutomationService);

  /** Parâmetro de rota. */
  readonly id = input.required<string>();
  /** Contexto opcional: execução iniciada a partir de um PTA (?workpaperId=). */
  readonly workpaperId = input<string>();

  protected readonly automation = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.service.get(params),
  });

  protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => {
    const wp = this.workpaperId();
    return [
      ...(wp
        ? [{ label: wp, link: ['/workpapers', wp] }]
        : [{ label: 'Automações', link: '/automations' }]),
      { label: this.automation.value()?.name ?? 'Automação' },
    ];
  });
}
