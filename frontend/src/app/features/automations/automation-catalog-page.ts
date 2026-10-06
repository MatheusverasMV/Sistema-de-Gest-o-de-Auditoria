import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  AUTOMATION_CATEGORIES,
  AutomationCategory,
  EXECUTION_STATUS_META,
} from '../../core/models';
import { RelativeTimePipe } from '../../shared/pipes/pipes';
import {
  Button,
  Card,
  CellDef,
  DataTable,
  EmptyState,
  Icon,
  LoadingState,
  PageHeader,
  Person,
  SearchInput,
  StatusBadge,
  TableColumn,
} from '../../shared/ui';
import { AutomationService } from './automation.service';

@Component({
  selector: 'sga-automation-catalog-page',
  imports: [
    RouterLink,
    PageHeader,
    Card,
    Icon,
    Button,
    SearchInput,
    StatusBadge,
    EmptyState,
    LoadingState,
    DataTable,
    CellDef,
    Person,
    RelativeTimePipe,
  ],
  templateUrl: './automation-catalog-page.html',
  styleUrl: './automation-catalog-page.scss',
})
export default class AutomationCatalogPage {
  private readonly service = inject(AutomationService);

  protected readonly categories = AUTOMATION_CATEGORIES;
  protected readonly executionStatus = EXECUTION_STATUS_META;
  protected readonly category = signal<AutomationCategory | null>(null);
  protected readonly query = signal('');

  protected readonly automations = rxResource({
    stream: () => this.service.list(),
    defaultValue: [],
  });
  protected readonly executions = rxResource({
    stream: () => this.service.recentExecutions(),
    defaultValue: [],
  });

  protected readonly countByCategory = computed(() => {
    const counts = new Map<AutomationCategory, number>();
    for (const a of this.automations.value()) {
      counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    }
    return counts;
  });

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const category = this.category();
    return this.automations
      .value()
      .filter(
        (a) =>
          (!category || a.category === category) &&
          (!q || `${a.name} ${a.description}`.toLowerCase().includes(q)),
      );
  });

  protected readonly executionColumns: TableColumn[] = [
    { key: 'id', label: 'Execução', width: '110px' },
    { key: 'automationName', label: 'Automação' },
    { key: 'client', label: 'Cliente', width: '170px' },
    { key: 'workpaper', label: 'PTA vinculado', width: '140px' },
    { key: 'executedBy', label: 'Executada por', width: '170px' },
    { key: 'when', label: 'Quando', width: '110px' },
    { key: 'status', label: 'Status', width: '120px' },
  ];
}
