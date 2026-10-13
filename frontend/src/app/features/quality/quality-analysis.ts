import {
  AttributeObservation,
  BaselineStatus,
  ControlBaseline,
  ControlChartData,
  ControlChartPoint,
  IndividualObservation,
  ObservationContext,
  PeriodCountRecord,
  PointFact,
  QualityDataset,
  QualityMetricId,
  QualitySegment,
  QualitySeverity,
  QualitySignal,
  QualitySignalRule,
} from '../../core/models';
import {
  estimateIndividualsBaseline,
  estimateProportionCenter,
  estimateRateCenter,
  hoursDeviation,
  IndividualsBaseline,
  individualsMovingRangeChart,
  proportionChart,
  uChart,
} from './control-limits';
import {
  classifySignal,
  detectControlSignals,
  detectVariabilityIncreases,
  Direction,
  isUnfavorable,
  SignalHit,
} from './control-signals';
import { formatDate, formatDecimal, periodLabel } from './quality-format';
import { MIN_REFERENCE, QUALITY_METRICS, QualityMetricDefinition } from './quality-metrics';

/**
 * Transforma o dataset bruto em cartas, sinais e drill-down para um segmento.
 * Funções puras: a página só filtra e renderiza; o backend futuro pode devolver
 * esta mesma estrutura já calculada.
 */

export type QualityFilters = QualitySegment;

export interface BaselineSummary {
  /** `approved`: baseline versionada da firma · `segment`: estimada para o recorte filtrado. */
  readonly source: 'approved' | 'segment';
  readonly status: BaselineStatus;
  readonly version?: number;
  readonly referenceLabel: string;
  /** Observações (I-MR) ou períodos (p/u) no período de referência. */
  readonly sampleSize: number;
  readonly minimum: number;
  /** Por que o segmento não sustenta limites (somente com status `collecting`). */
  readonly insufficiency?: 'few-observations' | 'no-events';
  readonly approvedBy?: string;
  readonly approvedAt?: string;
}

export interface MetricAnalysis {
  readonly definition: QualityMetricDefinition;
  readonly baseline: BaselineSummary;
  /** null quando a população filtrada não sustenta limites de controle. */
  readonly chart: ControlChartData | null;
  /** Somente métricas I-MR. */
  readonly movingRange: ControlChartData | null;
  readonly signals: readonly QualitySignal[];
  /** Registros por segmento (cartas p/u), base da decomposição no drill-down. */
  readonly records: readonly PeriodCountRecord[];
}

export interface QualityView {
  readonly analyses: readonly MetricAnalysis[];
  /** Todos os sinais, do mais grave para o menos grave e, em seguida, do mais recente. */
  readonly signals: readonly QualitySignal[];
  readonly filtered: boolean;
}

export function isFiltered(filters: QualityFilters): boolean {
  return Boolean(filters.clientId || filters.engagementId || filters.auditArea);
}

export function matchesSegment(context: ObservationContext, segment: QualitySegment): boolean {
  return (
    (!segment.clientId || context.clientId === segment.clientId) &&
    (!segment.engagementId || context.engagementId === segment.engagementId) &&
    (!segment.auditArea || context.auditArea === segment.auditArea)
  );
}

export function analyzeQuality(dataset: QualityDataset, filters: QualityFilters): QualityView {
  const analyses = QUALITY_METRICS.map((definition) => analyzeMetric(definition, dataset, filters));
  return {
    analyses,
    signals: analyses.flatMap((a) => a.signals).sort(compareSignals),
    filtered: isFiltered(filters),
  };
}

export function analyzeMetric(
  definition: QualityMetricDefinition,
  dataset: QualityDataset,
  filters: QualityFilters,
): MetricAnalysis {
  const firmBaseline = currentBaseline(dataset.baselines, definition.id);
  // A baseline aprovada vale para a população em que foi estimada (a firma). Um recorte
  // filtrado é outra população e recebe limites próprios, sempre provisórios.
  const approved = isFiltered(filters) ? undefined : firmBaseline;
  return definition.method === 'I-MR'
    ? analyzeIndividuals(definition, dataset, filters, firmBaseline, approved)
    : analyzeAttribute(definition, dataset, filters, firmBaseline, approved);
}

/** Baseline vigente da firma (sem segmento) com a maior versão. */
export function currentBaseline(
  baselines: readonly ControlBaseline[],
  metricId: QualityMetricId,
): ControlBaseline {
  const candidates = baselines
    .filter((b) => b.metricId === metricId && !b.validTo && !isFiltered(b.segment))
    .sort((a, b) => b.version - a.version);
  if (!candidates.length) {
    throw new Error(`Baseline não encontrada para ${metricId}.`);
  }
  return candidates[0];
}

// ---------------------------------------------------------------- I-MR

interface PreparedObservation extends IndividualObservation {
  readonly facts: readonly PointFact[];
}

function analyzeIndividuals(
  definition: QualityMetricDefinition,
  dataset: QualityDataset,
  filters: QualityFilters,
  firmBaseline: ControlBaseline,
  approved: ControlBaseline | undefined,
): MetricAnalysis {
  const observations = prepareIndividuals(definition.id, dataset)
    .filter((o) => matchesSegment(o.context, filters))
    .sort((a, b) => a.date.localeCompare(b.date));
  const window = firmBaseline.reference;
  const reference = observations.filter((o) => inWindow(o.date, window));
  const minimum = MIN_REFERENCE['I-MR'];
  const reason = reference.length < minimum ? 'few-observations' : undefined;
  const baselineSummary = summarize(approved, window, reference.length, minimum, reason);

  if (!approved && reason) {
    return {
      definition,
      baseline: baselineSummary,
      chart: null,
      movingRange: null,
      signals: [],
      records: [],
    };
  }

  const baseline: IndividualsBaseline = approved
    ? { center: approved.centerLine, movingRangeMean: approved.parameters.movingRangeMean ?? 0 }
    : estimateIndividualsBaseline(reference.map((o) => o.value));
  const charts = individualsMovingRangeChart(observations, baseline, {
    lowerBound: definition.lowerBound,
  });

  const enrich = (point: ControlChartPoint, observation: PreparedObservation, index: number) => ({
    ...point,
    phase: inWindow(observation.date, window) ? ('reference' as const) : ('monitoring' as const),
    axisLabel: monthBoundaryLabel(observations, index),
    detail: observation.context.note,
    facts: observation.facts,
    context: observation.context,
  });
  const individuals: ControlChartData = {
    center: charts.individuals.center,
    points: charts.individuals.points.map((p, i) => enrich(p, observations[i], i)),
  };
  const movingRange: ControlChartData = {
    center: charts.movingRange.center,
    points: charts.movingRange.points.map((p, i) => ({
      ...enrich(p, observations[i + 1], i + 1),
      facts: [
        { label: 'Entre', value: `${observations[i].label} e ${observations[i + 1].label}` },
        ...observations[i + 1].facts.slice(0, 1),
      ],
    })),
  };

  const dateOf = (point: ControlChartPoint) =>
    observations.find((o) => o.id === point.id)?.date ?? '';
  const primary = detectControlSignals(individuals).map((hit) =>
    buildSignal(definition, 'primary', hit, individuals, dateOf),
  );
  const variability = detectVariabilityIncreases(individuals, movingRange).map((indices) =>
    buildSignal(
      definition,
      'moving-range',
      { rule: 'variability', direction: 'up', indices },
      movingRange,
      dateOf,
    ),
  );
  const signals = [...primary, ...variability];

  return {
    definition,
    baseline: baselineSummary,
    chart: flagPoints(
      individuals,
      signals.filter((s) => s.chart === 'primary'),
    ),
    movingRange: flagPoints(movingRange, variability),
    signals,
    records: [],
  };
}

function prepareIndividuals(id: QualityMetricId, dataset: QualityDataset): PreparedObservation[] {
  switch (id) {
    case 'review-cycle':
      return dataset.reviewCycle.map((o) => ({
        ...o,
        facts: [
          segmentFact(o.context),
          peopleFact(o.context),
          { label: 'Aprovado em', value: formatDate(o.date) },
        ],
      }));
    case 'note-resolution':
      return dataset.noteResolution.map((o) => ({
        ...o,
        facts: [
          { label: 'PTA', value: o.context.workpaperId ?? o.context.workpaperCode ?? '—' },
          segmentFact(o.context),
          peopleFact(o.context),
          { label: 'Resolvido em', value: formatDate(o.date) },
        ],
      }));
    case 'hours-deviation':
      return dataset.hoursDeviation.map((o) => ({
        id: o.id,
        label: o.label,
        date: o.date,
        value: hoursDeviation(o.plannedHours, o.actualHours),
        context: o.context,
        facts: [
          {
            label: 'Trabalho',
            value: `${o.context.clientName ?? '—'} · ${o.context.engagementName ?? '—'}`,
          },
          { label: 'Horas planejadas', value: `${formatDecimal(o.plannedHours, 0)} h` },
          { label: 'Horas realizadas', value: `${formatDecimal(o.actualHours, 0)} h` },
        ],
      }));
    default:
      return [];
  }
}

/** Rótulo do mês somente na primeira observação de cada mês, para um eixo X legível. */
function monthBoundaryLabel(observations: readonly IndividualObservation[], index: number): string {
  const month = observations[index].date.slice(0, 7);
  return index === 0 || observations[index - 1].date.slice(0, 7) !== month
    ? periodLabel(month)
    : '';
}

function segmentFact(context: ObservationContext): PointFact {
  return {
    label: 'Cliente · área',
    value: `${context.clientName ?? '—'} · ${context.auditArea ?? '—'}`,
  };
}

function peopleFact(context: ObservationContext): PointFact {
  return {
    label: 'Preparador → revisor',
    value: `${context.preparer ?? '—'} → ${context.reviewer ?? '—'}`,
  };
}

// ---------------------------------------------------------------- p / u

interface PeriodAggregate extends AttributeObservation {
  readonly period: string;
  readonly records: readonly PeriodCountRecord[];
}

function analyzeAttribute(
  definition: QualityMetricDefinition,
  dataset: QualityDataset,
  filters: QualityFilters,
  firmBaseline: ControlBaseline,
  approved: ControlBaseline | undefined,
): MetricAnalysis {
  const records = attributeRecords(definition.id, dataset).filter((r) =>
    matchesSegment(r.context, filters),
  );
  const periods = aggregateByPeriod(records);
  const window = firmBaseline.reference;
  const reference = periods.filter((p) => inWindow(`${p.period}-01`, window));
  const minimum = MIN_REFERENCE[definition.method];
  const isProportion = definition.method === 'p';
  const center =
    approved?.centerLine ??
    (isProportion ? estimateProportionCenter(reference) : estimateRateCenter(reference));
  // Sem nenhuma ocorrência na referência, p̄ = ū = 0 e os limites colapsam em zero.
  const reason =
    reference.length < minimum ? 'few-observations' : center === 0 ? 'no-events' : undefined;
  const baselineSummary = summarize(approved, window, reference.length, minimum, reason);

  if (!approved && reason) {
    return {
      definition,
      baseline: baselineSummary,
      chart: null,
      movingRange: null,
      signals: [],
      records,
    };
  }
  const raw = isProportion ? proportionChart(periods, center) : uChart(periods, center);
  const chart: ControlChartData = {
    center,
    points: raw.points.map((p, i) => {
      const aggregate = periods[i];
      const top = topContributor(aggregate.records);
      const notes = aggregate.records.map((r) => r.context.note).filter(Boolean);
      return {
        ...p,
        id: aggregate.period,
        phase: inWindow(`${aggregate.period}-01`, window) ? 'reference' : 'monitoring',
        detail: notes.length ? notes.join(' · ') : undefined,
        facts: attributeFacts(definition.id, aggregate, top),
        context: top
          ? { ...top.context, note: notes.length ? notes.join(' · ') : undefined }
          : undefined,
      };
    }),
  };

  const signals = detectControlSignals(chart).map((hit) =>
    buildSignal(definition, 'primary', hit, chart, (point) => `${point.id}-28`),
  );
  return {
    definition,
    baseline: baselineSummary,
    chart: flagPoints(chart, signals),
    movingRange: null,
    signals,
    records,
  };
}

function attributeRecords(
  id: QualityMetricId,
  dataset: QualityDataset,
): readonly PeriodCountRecord[] {
  switch (id) {
    case 'rework':
      return dataset.rework;
    case 'review-notes':
      return dataset.reviewNotes;
    case 'overdue-requests':
      return dataset.overdueRequests;
    default:
      return [];
  }
}

/** Soma os segmentos de cada mês; meses sem exposição não entram na carta. */
function aggregateByPeriod(records: readonly PeriodCountRecord[]): PeriodAggregate[] {
  const byPeriod = new Map<string, PeriodCountRecord[]>();
  for (const record of records) {
    byPeriod.set(record.period, [...(byPeriod.get(record.period) ?? []), record]);
  }
  return [...byPeriod.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, group]) => ({
      period,
      label: periodLabel(period),
      count: group.reduce((sum, r) => sum + r.count, 0),
      exposure: group.reduce((sum, r) => sum + r.exposure, 0),
      records: group,
    }))
    .filter((p) => p.exposure > 0);
}

/** Segmento com mais ocorrências no período (desempate pela maior taxa). */
function topContributor(records: readonly PeriodCountRecord[]): PeriodCountRecord | undefined {
  return [...records]
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || b.count / b.exposure - a.count / a.exposure)[0];
}

function attributeFacts(
  id: QualityMetricId,
  aggregate: PeriodAggregate,
  top: PeriodCountRecord | undefined,
): PointFact[] {
  const concentration: PointFact[] = top
    ? [
        {
          label: 'Maior concentração',
          value: `${top.context.clientName} · ${top.context.auditArea} (${top.count})`,
        },
      ]
    : [];
  switch (id) {
    case 'rework':
      return [{ label: 'PTAs devolvidos', value: `${aggregate.count} de ${aggregate.exposure}` }];
    case 'review-notes':
      return [
        { label: 'Review notes', value: String(aggregate.count) },
        { label: 'PTAs revisados', value: String(aggregate.exposure) },
      ];
    case 'overdue-requests':
      return [
        {
          label: 'Solicitações vencidas',
          value: `${aggregate.count} de ${aggregate.exposure}`,
        },
        ...concentration,
      ];
    default:
      return [];
  }
}

// ---------------------------------------------------------------- sinais

const SEVERITY_RANK: Record<QualitySeverity, number> = { critical: 0, attention: 1, info: 2 };

function compareSignals(a: QualitySignal, b: QualitySignal): number {
  return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.date.localeCompare(a.date);
}

interface SignalSource {
  readonly rule: QualitySignalRule;
  readonly direction: Direction;
  readonly indices: readonly number[];
}

function buildSignal(
  definition: QualityMetricDefinition,
  chartKind: QualitySignal['chart'],
  source: SignalHit | SignalSource,
  chart: ControlChartData,
  dateOf: (point: ControlChartPoint) => string,
): QualitySignal {
  const points = source.indices.map((i) => chart.points[i]);
  const anchor = points[points.length - 1];
  const isLatest = source.indices[source.indices.length - 1] === chart.points.length - 1;
  const severity: QualitySeverity =
    source.rule === 'variability'
      ? 'attention'
      : classifySignal(source as SignalHit, definition.polarity);
  const { title, message } = signalText(definition, source, points, isLatest);
  return {
    id: `${definition.id}:${source.rule}:${anchor.id}`,
    metricId: definition.id,
    severity,
    rule: source.rule,
    title,
    message,
    chart: chartKind,
    pointId: anchor.id,
    pointIds: points.map((p) => p.id),
    pointLabel: points.length > 1 ? `${points[0].label} → ${anchor.label}` : anchor.label,
    date: dateOf(anchor),
    context: anchor.context,
  };
}

function signalText(
  definition: QualityMetricDefinition,
  source: SignalSource,
  points: readonly ControlChartPoint[],
  isLatest: boolean,
): { title: string; message: string } {
  const subject = capitalize(definition.subject);
  const anchor = points[points.length - 1];
  const fmt = definition.formatLong;
  const unfavorable = isUnfavorable(source.direction, definition.polarity);

  if (source.rule === 'variability') {
    return {
      title: 'Aumento da variabilidade',
      message: `${subject} permanece dentro dos limites, mas as observações consecutivas estão mais irregulares que o histórico (amplitude móvel acima do LSC).`,
    };
  }
  if (source.rule === 'trend') {
    const verb = source.direction === 'up' ? 'aumentou' : 'diminuiu';
    const where = isLatest
      ? `nas últimas ${points.length} observações`
      : `em ${points.length} observações consecutivas (${points[0].label} a ${anchor.label})`;
    return {
      title: unfavorable ? 'Tendência de deterioração detectada' : 'Tendência de melhora detectada',
      message: `${subject} ${verb} continuamente ${where}.`,
    };
  }
  const above = source.direction === 'up';
  const limit = above ? `LSC ${fmt(anchor.ucl)}` : `LIC ${fmt(anchor.lcl)}`;
  const base = `${subject} ${definition.describePoint(anchor.label)} ficou ${above ? 'acima' : 'abaixo'} do comportamento histórico esperado (${fmt(anchor.value)}; ${limit}).`;
  return unfavorable
    ? { title: 'Causa especial detectada', message: base }
    : {
        title: 'Causa especial no sentido favorável',
        message: `${base} Confirme se reflete melhoria real do processo ou mudança no registro.`,
      };
}

/** Marca nos pontos a severidade do sinal mais grave que os envolve. */
function flagPoints(chart: ControlChartData, signals: readonly QualitySignal[]): ControlChartData {
  const flags = new Map<string, QualitySeverity>();
  for (const signal of signals) {
    for (const id of signal.pointIds) {
      const current = flags.get(id);
      if (!current || SEVERITY_RANK[signal.severity] < SEVERITY_RANK[current]) {
        flags.set(id, signal.severity);
      }
    }
  }
  return {
    ...chart,
    points: chart.points.map((p) => (flags.has(p.id) ? { ...p, flag: flags.get(p.id) } : p)),
  };
}

// ---------------------------------------------------------------- baseline

function summarize(
  approved: ControlBaseline | undefined,
  window: ControlBaseline['reference'],
  referenceCount: number,
  minimum: number,
  insufficiency: BaselineSummary['insufficiency'],
): BaselineSummary {
  const referenceLabel = `${periodLabel(window.from.slice(0, 7))} – ${periodLabel(window.to.slice(0, 7))}`;
  if (approved) {
    return {
      source: 'approved',
      status: approved.status,
      version: approved.version,
      referenceLabel,
      sampleSize: approved.sampleSize,
      minimum,
      approvedBy: approved.approvedBy,
      approvedAt: approved.approvedAt,
    };
  }
  return {
    source: 'segment',
    status: insufficiency ? 'collecting' : 'provisional',
    referenceLabel,
    sampleSize: referenceCount,
    minimum,
    insufficiency,
  };
}

function inWindow(date: string, window: ControlBaseline['reference']): boolean {
  return date >= window.from && date <= window.to;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ---------------------------------------------------------------- filtros

export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

export interface QualityFilterOptions {
  readonly clients: readonly FilterOption[];
  readonly engagements: readonly FilterOption[];
  readonly areas: readonly FilterOption[];
}

/** Opções em cascata: trabalhos do cliente escolhido; áreas do cliente/trabalho escolhidos. */
export function filterOptions(
  dataset: QualityDataset,
  filters: QualityFilters,
): QualityFilterOptions {
  const contexts = allContexts(dataset);
  const clients = unique(
    contexts,
    (c) => c.clientId,
    (c) => c.clientName,
  );
  const ofClient = contexts.filter((c) => !filters.clientId || c.clientId === filters.clientId);
  const engagements = unique(
    ofClient,
    (c) => c.engagementId,
    (c) => (filters.clientId ? c.engagementName : `${c.clientName} — ${c.engagementName}`),
  );
  const ofEngagement = ofClient.filter(
    (c) => !filters.engagementId || c.engagementId === filters.engagementId,
  );
  const areas = unique(
    ofEngagement,
    (c) => c.auditArea,
    (c) => c.auditArea,
  );
  return { clients, engagements, areas };
}

function allContexts(dataset: QualityDataset): ObservationContext[] {
  return [
    ...dataset.reviewCycle,
    ...dataset.noteResolution,
    ...dataset.hoursDeviation,
    ...dataset.rework,
    ...dataset.reviewNotes,
    ...dataset.overdueRequests,
  ].map((o) => o.context);
}

function unique(
  contexts: readonly ObservationContext[],
  value: (c: ObservationContext) => string | undefined,
  label: (c: ObservationContext) => string | undefined,
): FilterOption[] {
  const options = new Map<string, string>();
  for (const context of contexts) {
    const key = value(context);
    if (key && !options.has(key)) {
      options.set(key, label(context) ?? key);
    }
  }
  return [...options.entries()]
    .map(([v, l]) => ({ value: v, label: l }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

// ---------------------------------------------------------------- drill-down

export interface BreakdownRow {
  readonly clientName: string;
  readonly engagementName: string;
  readonly auditArea: string;
  readonly count: number;
  readonly exposure: number;
  readonly note?: string;
}

export interface DrillDown {
  readonly analysis: MetricAnalysis;
  readonly chart: QualitySignal['chart'];
  readonly point: ControlChartPoint;
  readonly center: number;
  readonly signals: readonly QualitySignal[];
  /** Decomposição do mês por segmento (cartas p/u), da maior para a menor contribuição. */
  readonly breakdown: readonly BreakdownRow[];
  /** Observações que compõem o sinal (sequência de tendência ou par da amplitude móvel). */
  readonly related: readonly ControlChartPoint[];
}

export function buildDrillDown(
  analysis: MetricAnalysis,
  chartKind: QualitySignal['chart'],
  pointId: string,
): DrillDown | null {
  const chart = chartKind === 'primary' ? analysis.chart : analysis.movingRange;
  const point = chart?.points.find((p) => p.id === pointId);
  if (!chart || !point) {
    return null;
  }
  const signals = analysis.signals.filter(
    (s) => s.chart === chartKind && s.pointIds.includes(pointId),
  );
  const relatedIds = new Set(signals.flatMap((s) => (s.pointIds.length > 1 ? s.pointIds : [])));
  if (chartKind === 'moving-range' && analysis.chart) {
    const index = analysis.chart.points.findIndex((p) => p.id === pointId);
    analysis.chart.points
      .slice(Math.max(0, index - 1), index + 1)
      .forEach((p) => relatedIds.add(p.id));
  }
  const relatedSource = chartKind === 'moving-range' ? analysis.chart! : chart;

  const breakdown = analysis.records
    .filter((r) => r.period === point.id && r.exposure > 0)
    .map((r) => ({
      clientName: r.context.clientName ?? '—',
      engagementName: r.context.engagementName ?? '—',
      auditArea: r.context.auditArea ?? '—',
      count: r.count,
      exposure: r.exposure,
      note: r.context.note,
    }))
    .sort((a, b) => b.count - a.count || b.count / b.exposure - a.count / a.exposure);

  return {
    analysis,
    chart: chartKind,
    point,
    center: chart.center,
    signals,
    breakdown,
    related: relatedSource.points.filter((p) => relatedIds.has(p.id)),
  };
}
