import { BaselineStatus, QualitySeverity, QualitySignal } from '../../core/models';
import { BaselineSummary } from './quality-analysis';
import { formatDate } from './quality-format';
import { QualityMetricDefinition } from './quality-metrics';

/** Apresentação das severidades: texto + ícone + cor, para não depender só da cor. */
export const SEVERITY_META: Record<
  QualitySeverity,
  { readonly label: string; readonly icon: string; readonly tone: 'danger' | 'warning' | 'info' }
> = {
  critical: { label: 'Crítico', icon: 'triangle-alert', tone: 'danger' },
  attention: { label: 'Atenção', icon: 'circle-alert', tone: 'warning' },
  info: { label: 'Informativo', icon: 'info', tone: 'info' },
};

export const BASELINE_STATUS_LABEL: Record<BaselineStatus, string> = {
  collecting: 'Coletando dados',
  provisional: 'Baseline provisória',
  review: 'Baseline em revisão',
  monitoring: 'Monitoramento',
};

export function worstSeverity(signals: readonly QualitySignal[]): QualitySeverity | null {
  const order: QualitySeverity[] = ['critical', 'attention', 'info'];
  return order.find((s) => signals.some((signal) => signal.severity === s)) ?? null;
}

/** "Baseline v2 · Monitoramento · aprovada por … em … · referência mai/26 – jun/26 (26 PTAs concluídos)" */
export function describeBaseline(
  baseline: BaselineSummary,
  definition: QualityMetricDefinition,
): string {
  const reference = `referência ${baseline.referenceLabel} (${baseline.sampleSize} ${definition.observationNoun})`;
  if (baseline.source === 'approved') {
    const approval = baseline.approvedBy
      ? ` · aprovada por ${baseline.approvedBy}${baseline.approvedAt ? ` em ${formatDate(baseline.approvedAt)}` : ''}`
      : '';
    return `Baseline v${baseline.version} da firma · ${BASELINE_STATUS_LABEL[baseline.status]}${approval} · ${reference}`;
  }
  return `${BASELINE_STATUS_LABEL[baseline.status]} do recorte filtrado · estimada no mesmo período da baseline da firma · ${reference}`;
}

/** Explica por que um recorte não recebeu limites de controle. */
export function describeInsufficiency(
  baseline: BaselineSummary,
  definition: QualityMetricDefinition,
): string {
  if (baseline.insufficiency === 'no-events') {
    return `O recorte não teve ocorrências no período de referência (${baseline.referenceLabel}); com taxa zero, os limites não podem ser estimados.`;
  }
  return `O recorte tem ${baseline.sampleSize} ${definition.observationNoun} no período de referência (${baseline.referenceLabel}); são necessários ao menos ${baseline.minimum}. Os limites não são estimados para evitar conclusões sem base estatística.`;
}
