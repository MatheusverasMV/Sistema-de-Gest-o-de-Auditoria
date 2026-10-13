import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { QualityMetricId, QualitySignal } from '../../core/models';
import {
  Button,
  Card,
  Drawer,
  EmptyState,
  FormField,
  FormInput,
  Icon,
  KpiCard,
  LoadingState,
  PageHeader,
} from '../../shared/ui';
import { QualityDrillDown } from './drill-down/drill-down';
import { ChartPointSelection } from './imr-panel/imr-panel';
import { QualityMetricCard } from './metric-card/metric-card';
import { QualityFilters } from './quality-analysis';
import { QUALITY_DIMENSIONS } from './quality-metrics';
import { QualityService } from './quality.service';
import { SEVERITY_META } from './quality-ui';
import { QualitySignalList } from './signal-list/signal-list';

interface DrillTarget {
  readonly metricId: QualityMetricId;
  readonly chart: QualitySignal['chart'];
  readonly pointId: string;
}

@Component({
  selector: 'sga-quality-page',
  imports: [
    PageHeader,
    KpiCard,
    Card,
    EmptyState,
    LoadingState,
    Button,
    Icon,
    Drawer,
    FormField,
    FormInput,
    QualityMetricCard,
    QualitySignalList,
    QualityDrillDown,
  ],
  templateUrl: './quality-page.html',
  styleUrl: './quality-page.scss',
})
export default class QualityPage {
  private readonly service = inject(QualityService);

  protected readonly source = rxResource({ stream: () => this.service.source() });
  protected readonly filters = signal<QualityFilters>({});

  protected readonly dashboard = computed(() => {
    const source = this.source.value();
    return source ? this.service.dashboard(source, this.filters()) : null;
  });

  protected readonly sections = computed(() => {
    const analyses = this.dashboard()?.view.analyses ?? [];
    return QUALITY_DIMENSIONS.map((dimension) => ({
      ...dimension,
      analyses: analyses.filter((a) => a.definition.dimension === dimension.id),
    }));
  });

  protected readonly signalSummary = computed(() => {
    const signals = this.dashboard()?.view.signals ?? [];
    return (['critical', 'attention', 'info'] as const)
      .map((severity) => ({
        severity,
        count: signals.filter((s) => s.severity === severity).length,
        ...SEVERITY_META[severity],
      }))
      .filter((s) => s.count > 0);
  });

  protected readonly drillTarget = signal<DrillTarget | null>(null);
  protected readonly drill = computed(() => {
    const target = this.drillTarget();
    const source = this.source.value();
    const dashboard = this.dashboard();
    return target && source && dashboard
      ? this.service.drillDown(source, dashboard.view, target)
      : null;
  });

  protected selectedFor(metricId: QualityMetricId) {
    const target = this.drillTarget();
    return target?.metricId === metricId ? { chart: target.chart, id: target.pointId } : null;
  }

  protected setClient(clientId: string): void {
    // Trocar o cliente invalida trabalho e área escolhidos para o cliente anterior.
    this.filters.set({ clientId: clientId || undefined });
  }

  protected setEngagement(engagementId: string): void {
    this.filters.update((f) => ({
      clientId: f.clientId,
      engagementId: engagementId || undefined,
    }));
  }

  protected setArea(auditArea: string): void {
    this.filters.update((f) => ({ ...f, auditArea: auditArea || undefined }));
  }

  protected clearFilters(): void {
    this.filters.set({});
  }

  protected openSignal(signal: QualitySignal): void {
    this.drillTarget.set({
      metricId: signal.metricId,
      chart: signal.chart,
      pointId: signal.pointId,
    });
  }

  protected openPoint(metricId: QualityMetricId, selection: ChartPointSelection): void {
    this.drillTarget.set({ metricId, chart: selection.chart, pointId: selection.point.id });
  }

  protected onDrawerOpenChange(open: boolean): void {
    if (!open) {
      this.drillTarget.set(null);
    }
  }

  protected value(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }
}
