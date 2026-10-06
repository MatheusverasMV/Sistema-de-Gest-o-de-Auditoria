import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CalendarDatePipe, CompactCurrencyPipe } from '../../shared/pipes/pipes';
import {
  Card,
  CellDef,
  DataTable,
  EmptyState,
  KpiCard,
  LoadingState,
  PageHeader,
  StatusBadge,
  TableColumn,
} from '../../shared/ui';
import { AnalyticsService } from './analytics.service';

const DEMO_ENGAGEMENT_ID = 'eng-alfa-2026';

@Component({
  selector: 'sga-analytics-page',
  imports: [
    PageHeader,
    KpiCard,
    Card,
    DataTable,
    CellDef,
    StatusBadge,
    EmptyState,
    LoadingState,
    CurrencyPipe,
    DecimalPipe,
    CalendarDatePipe,
    CompactCurrencyPipe,
  ],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.scss',
})
export default class AnalyticsPage {
  private readonly service = inject(AnalyticsService);

  protected readonly view = rxResource({
    stream: () => this.service.ledgerAnalysis(DEMO_ENGAGEMENT_ID),
  });
  protected readonly analysis = computed(() => this.view.value()?.analysis ?? null);

  protected readonly hoveredMonth = signal<number | null>(null);
  protected readonly maxMonthly = computed(() =>
    Math.max(...(this.analysis()?.monthly.map((m) => m.amount) ?? [1])),
  );
  protected readonly peakIndex = computed(() =>
    (this.analysis()?.monthly ?? []).findIndex((m) => m.amount === this.maxMonthly()),
  );
  protected readonly readout = computed(() => {
    const months = this.analysis()?.monthly ?? [];
    return months[this.hoveredMonth() ?? this.peakIndex()];
  });

  protected readonly columns: TableColumn[] = [
    { key: 'document', label: 'Documento', width: '110px' },
    { key: 'date', label: 'Data', width: '100px' },
    { key: 'description', label: 'Histórico' },
    { key: 'flag', label: 'Alerta', width: '170px' },
    { key: 'amount', label: 'Valor', align: 'right', width: '150px' },
  ];
}
