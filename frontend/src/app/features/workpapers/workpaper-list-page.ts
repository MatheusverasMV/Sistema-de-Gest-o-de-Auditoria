import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { WORKPAPER_STATUS_META, WorkpaperStatus } from '../../core/models';
import {
  Button,
  Card,
  EmptyState,
  FormField,
  FormInput,
  PageHeader,
  SearchInput,
} from '../../shared/ui';
import { WorkpaperService } from './workpaper.service';
import { WorkpaperTable } from './workpaper-table';

@Component({
  selector: 'sga-workpaper-list-page',
  imports: [
    FormsModule,
    PageHeader,
    Card,
    SearchInput,
    FormField,
    FormInput,
    WorkpaperTable,
    EmptyState,
    Button,
  ],
  template: `
    <div class="page">
      <sga-page-header
        heading="Papéis de Trabalho"
        subheading="Todos os PTAs dos trabalhos em que você atua."
      />

      <div class="toolbar">
        <sga-search-input
          class="grow"
          label="Buscar PTAs"
          placeholder="Código, área ou título…"
          [(value)]="query"
        />
        <sga-form-field label="Cliente" for="client-filter">
          <select sgaInput id="client-filter" [(ngModel)]="client">
            <option value="">Todos</option>
            @for (c of clients(); track c) {
              <option [value]="c">{{ c }}</option>
            }
          </select>
        </sga-form-field>
        <sga-form-field label="Status" for="wp-status-filter">
          <select sgaInput id="wp-status-filter" [(ngModel)]="status">
            <option value="">Todos</option>
            @for (option of statusOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </sga-form-field>
      </div>

      <sga-card [flush]="true">
        @if (workpapers.error()) {
          <sga-empty-state
            heading="Não foi possível carregar os PTAs"
            icon="circle-alert"
            tone="danger"
          >
            <button sgaButton type="button" icon="rotate-ccw" (click)="workpapers.reload()">
              Tentar novamente
            </button>
          </sga-empty-state>
        } @else {
          <sga-workpaper-table
            [rows]="filtered()"
            [loading]="workpapers.isLoading()"
            [showClient]="true"
            emptyDescription="Nenhum PTA corresponde aos filtros aplicados."
          />
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
  `,
})
export default class WorkpaperListPage {
  private readonly service = inject(WorkpaperService);

  /** Termo vindo da busca global (?q=). */
  readonly q = input<string>();

  protected readonly statusOptions = (Object.keys(WORKPAPER_STATUS_META) as WorkpaperStatus[]).map(
    (value) => ({
      value,
      label: WORKPAPER_STATUS_META[value].label,
    }),
  );

  protected readonly query = linkedSignal(() => this.q() ?? '');
  protected readonly client = signal('');
  protected readonly status = signal<WorkpaperStatus | ''>('');

  protected readonly workpapers = rxResource({
    stream: () => this.service.list(),
    defaultValue: [],
  });

  protected readonly clients = computed(() => [
    ...new Set(
      this.workpapers
        .value()
        .map((row) => row.engagement?.client ?? '')
        .filter(Boolean),
    ),
  ]);

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.workpapers
      .value()
      .filter(({ workpaper, engagement }) => {
        const haystack =
          `${workpaper.id} ${workpaper.area} ${workpaper.title} ${engagement?.client ?? ''}`.toLowerCase();
        return (
          (!q || haystack.includes(q)) &&
          (!this.client() || engagement?.client === this.client()) &&
          (!this.status() || workpaper.status === this.status())
        );
      })
      .map(({ workpaper, engagement }) => ({ workpaper, client: engagement?.client }));
  });
}
