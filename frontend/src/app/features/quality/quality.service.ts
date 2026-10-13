import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { EntityCatalog } from '../../core/data/entity-catalog';
import { QualityRepository } from '../../core/data/repositories';
import {
  EngagementIdentity,
  QualityDataset,
  QualityMetric,
  QualityMetricId,
  QualitySignal,
} from '../../core/models';
import { EntityResolutionService } from '../../core/services/entity-resolution.service';
import { mean } from './control-limits';
import {
  analyzeQuality,
  buildDrillDown,
  DrillDown,
  filterOptions,
  matchesSegment,
  QualityFilterOptions,
  QualityFilters,
  QualityView,
} from './quality-analysis';
import { formatDays, formatPercent } from './quality-format';
import { OperationalLinks, resolveOperationalLinks } from './quality-links';

/** Dados brutos da página, carregados uma vez; filtros e cartas são recalculados localmente. */
export interface QualitySource {
  readonly dataset: QualityDataset;
  /** Catálogo canônico de entidades: resolve clientes, trabalhos, PTAs e quadros. */
  readonly catalog: EntityCatalog;
}

/** Drill-down estatístico + vínculos com os registros operacionais. */
export interface LinkedDrillDown extends DrillDown {
  readonly links: OperationalLinks;
}

export interface QualityDashboard {
  readonly metrics: readonly QualityMetric[];
  readonly view: QualityView;
  readonly options: QualityFilterOptions;
  readonly segmentLabel: string;
}

const KPI_WINDOW_DAYS = 28;

@Injectable({ providedIn: 'root' })
export class QualityService {
  private readonly quality = inject(QualityRepository);
  private readonly entities = inject(EntityResolutionService);

  source(): Observable<QualitySource> {
    return combineLatest([this.quality.dataset(), this.entities.catalog()]).pipe(
      map(([dataset, catalog]) => ({ dataset, catalog })),
    );
  }

  dashboard(source: QualitySource, filters: QualityFilters): QualityDashboard {
    const view = analyzeQuality(source.dataset, filters);
    const options = filterOptions(source.dataset, filters);
    return {
      view,
      options,
      metrics: this.kpis(source, filters, view),
      segmentLabel: segmentLabel(filters, options),
    };
  }

  drillDown(
    source: QualitySource,
    view: QualityView,
    target: { metricId: QualityMetricId; chart: QualitySignal['chart']; pointId: string },
  ): LinkedDrillDown | null {
    const analysis = view.analyses.find((a) => a.definition.id === target.metricId);
    const drill = analysis ? buildDrillDown(analysis, target.chart, target.pointId) : null;
    return drill
      ? {
          ...drill,
          links: resolveOperationalLinks(
            source.catalog,
            drill.point.context,
            analysis!.definition.method !== 'I-MR',
          ),
        }
      : null;
  }

  /** KPIs de apoio. Respondem ao recorte, mas não substituem as cartas. */
  private kpis(source: QualitySource, filters: QualityFilters, view: QualityView): QualityMetric[] {
    const { dataset, catalog } = source;
    // Recorte por ids canônicos (cliente e trabalho), sem comparar nomes.
    const inScope = (engagement: EngagementIdentity | undefined) =>
      engagement?.recordKind === 'operational' &&
      (!filters.clientId || engagement.clientId === filters.clientId) &&
      (!filters.engagementId || engagement.id === filters.engagementId);

    const atRisk = dataset.engagementsAtRisk
      .map((id) => catalog.engagements.get(id))
      .filter(inScope);
    const awaiting = [...catalog.workpapers.values()].filter(
      (w) =>
        w.status === 'awaiting_review' &&
        inScope(catalog.engagements.get(w.engagementId)) &&
        (!filters.auditArea || w.area === filters.auditArea),
    ).length;
    const clientName = (engagement: EngagementIdentity | undefined) =>
      catalog.clients.get(engagement?.clientId ?? '')?.name ?? '—';

    // Agregação executiva: média das últimas semanas. A carta usa cada PTA como observação.
    const cycle = dataset.reviewCycle.filter((o) => matchesSegment(o.context, filters));
    const latestDate = cycle.reduce((max, o) => (o.date > max ? o.date : max), '');
    const since = latestDate ? shiftDays(latestDate, -KPI_WINDOW_DAYS) : '';
    const recent = cycle.filter((o) => o.date > since);
    const cycleCenter = view.analyses.find((a) => a.definition.id === 'review-cycle')?.chart
      ?.center;

    const rework = view.analyses.find((a) => a.definition.id === 'rework')?.chart;
    const lastRework = rework?.points[rework.points.length - 1];

    return [
      {
        id: 'at-risk',
        label: 'Trabalhos em risco',
        value: String(atRisk.length),
        hint: atRisk.length ? atRisk.map(clientName).join(' · ') : 'Nenhum no recorte',
        icon: 'triangle-alert',
        tone: atRisk.length ? 'danger' : 'neutral',
      },
      {
        id: 'awaiting-review',
        label: 'PTAs aguardando revisão',
        value: String(awaiting),
        hint: 'Fila atual nos trabalhos ativos',
        icon: 'hourglass',
        tone: awaiting ? 'warning' : 'neutral',
      },
      {
        id: 'review-time',
        label: 'Tempo médio de revisão',
        value: recent.length ? formatDays(mean(recent.map((o) => o.value))) : '—',
        hint: recent.length
          ? `Últimas 4 semanas · ${recent.length} PTAs${cycleCenter !== undefined ? ` · LC ${formatDays(cycleCenter)}` : ''}`
          : 'Sem PTAs concluídos no recorte',
        icon: 'clock',
        tone: 'neutral',
      },
      {
        id: 'rework-rate',
        label: 'Taxa atual de retrabalho',
        value: lastRework ? formatPercent(lastRework.value) : '—',
        hint: lastRework
          ? `${lastRework.label} · LC ${formatPercent(rework!.center)}`
          : 'Dados insuficientes no recorte',
        icon: 'rotate-ccw',
        tone: lastRework?.outOfControl ? 'danger' : 'neutral',
      },
    ];
  }
}

function segmentLabel(filters: QualityFilters, options: QualityFilterOptions): string {
  const parts = [
    options.clients.find((c) => c.value === filters.clientId)?.label,
    options.engagements.find((e) => e.value === filters.engagementId)?.label,
    filters.auditArea,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Firma — todos os clientes';
}

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
