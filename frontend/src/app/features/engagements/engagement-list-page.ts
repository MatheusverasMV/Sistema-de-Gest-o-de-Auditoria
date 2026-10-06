import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Engagement, ENGAGEMENT_STATUS_META, EngagementStatus, RISK_META } from '../../core/models';
import { CalendarDatePipe } from '../../shared/pipes/pipes';
import {
  Button,
  Card,
  CellDef,
  DataTable,
  EmptyState,
  FormField,
  FormInput,
  PageHeader,
  Person,
  ProgressBar,
  SearchInput,
  StatusBadge,
  TableColumn,
} from '../../shared/ui';
import { EngagementService } from './engagement.service';

@Component({
  selector: 'sga-engagement-list-page',
  imports: [
    FormsModule,
    PageHeader,
    Card,
    DataTable,
    CellDef,
    StatusBadge,
    ProgressBar,
    Person,
    SearchInput,
    FormField,
    FormInput,
    EmptyState,
    Button,
    CalendarDatePipe,
  ],
  template: `
    <div class="page">
      <sga-page-header
        heading="Trabalhos de Auditoria"
        subheading="Carteira de trabalhos da firma por cliente e exercício."
      />

      <div class="toolbar">
        <sga-search-input
          class="grow"
          label="Buscar trabalhos"
          placeholder="Buscar por cliente…"
          [(value)]="query"
        />
        <sga-form-field label="Status" for="status-filter">
          <select sgaInput id="status-filter" [(ngModel)]="status">
            <option value="">Todos</option>
            @for (option of statusOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </sga-form-field>
      </div>

      <sga-card [flush]="true">
        @if (engagements.error()) {
          <sga-empty-state
            heading="Não foi possível carregar os trabalhos"
            icon="circle-alert"
            tone="danger"
          >
            <button sgaButton type="button" icon="rotate-ccw" (click)="engagements.reload()">
              Tentar novamente
            </button>
          </sga-empty-state>
        } @else {
          <sga-data-table
            caption="Trabalhos de auditoria"
            [columns]="columns"
            [rows]="filtered()"
            [loading]="engagements.isLoading()"
            [interactive]="true"
            emptyHeading="Nenhum trabalho encontrado"
            emptyDescription="Ajuste a busca ou o filtro de status."
            (rowActivate)="open($event)"
          >
            <ng-template sgaCell="client" [sgaCellOf]="filtered()" let-row>
              <div class="client">
                <span class="client-name">{{ row.client }}</span>
                <span class="meta">{{ row.title }}</span>
              </div>
            </ng-template>
            <ng-template sgaCell="partner" [sgaCellOf]="filtered()" let-row>
              <sga-person [userId]="row.partnerId" [showRole]="true" />
            </ng-template>
            <ng-template sgaCell="progress" [sgaCellOf]="filtered()" let-row>
              <sga-progress-bar [value]="row.progress" [label]="'Progresso de ' + row.client" />
            </ng-template>
            <ng-template sgaCell="risk" [sgaCellOf]="filtered()" let-row>
              <sga-status-badge [label]="risk[row.risk].label" [tone]="risk[row.risk].tone" />
            </ng-template>
            <ng-template sgaCell="status" [sgaCellOf]="filtered()" let-row>
              <sga-status-badge
                [label]="statusMeta[row.status].label"
                [tone]="statusMeta[row.status].tone"
              />
            </ng-template>
            <ng-template sgaCell="reportDueDate" [sgaCellOf]="filtered()" let-row>
              <span class="mono">{{ row.reportDueDate | calendarDate }}</span>
            </ng-template>
          </sga-data-table>
        }
      </sga-card>
    </div>
  `,
  styles: `
    .grow {
      flex: 1;
      max-width: 360px;
    }
    sga-form-field {
      width: 200px;
    }
    .client {
      display: flex;
      flex-direction: column;
    }
    .client-name {
      font-weight: 600;
    }
  `,
})
export default class EngagementListPage {
  private readonly service = inject(EngagementService);
  private readonly router = inject(Router);

  protected readonly statusMeta = ENGAGEMENT_STATUS_META;
  protected readonly risk = RISK_META;
  protected readonly statusOptions = (
    Object.keys(ENGAGEMENT_STATUS_META) as EngagementStatus[]
  ).map((value) => ({
    value,
    label: ENGAGEMENT_STATUS_META[value].label,
  }));

  protected readonly columns: TableColumn[] = [
    { key: 'client', label: 'Cliente' },
    { key: 'fiscalYear', label: 'Exercício', width: '90px' },
    { key: 'partner', label: 'Responsável', width: '200px' },
    { key: 'progress', label: 'Progresso', width: '170px' },
    { key: 'risk', label: 'Risco', width: '110px' },
    { key: 'status', label: 'Status', width: '130px' },
    { key: 'reportDueDate', label: 'Prazo do relatório', width: '140px' },
  ];

  protected readonly query = signal('');
  protected readonly status = signal<EngagementStatus | ''>('');

  protected readonly engagements = rxResource({
    stream: () => this.service.list(),
    defaultValue: [],
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.status();
    return this.engagements
      .value()
      .filter(
        (e) =>
          (!status || e.status === status) &&
          (!q || `${e.client} ${e.title}`.toLowerCase().includes(q)),
      );
  });

  protected open(engagement: Engagement): void {
    this.router.navigate(['/engagements', engagement.id]);
  }
}
