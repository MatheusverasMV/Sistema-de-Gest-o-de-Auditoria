import { RecordKind } from './entity.model';
import { StatusMeta } from './status.model';

export type EngagementStatus = 'planning' | 'fieldwork' | 'review' | 'completed';

export const ENGAGEMENT_STATUS_META: Record<EngagementStatus, StatusMeta> = {
  planning: { label: 'Planejamento', tone: 'info' },
  fieldwork: { label: 'Em execução', tone: 'brand' },
  review: { label: 'Em revisão', tone: 'warning' },
  completed: { label: 'Concluído', tone: 'success' },
};

export type RiskLevel = 'low' | 'medium' | 'high';

export const RISK_META: Record<RiskLevel, StatusMeta> = {
  low: { label: 'Baixo', tone: 'success' },
  medium: { label: 'Moderado', tone: 'warning' },
  high: { label: 'Alto', tone: 'danger' },
};

export interface EngagementRisk {
  readonly id: string;
  readonly area: string;
  readonly description: string;
  readonly level: RiskLevel;
  readonly response: string;
}

export interface Milestone {
  readonly label: string;
  readonly date: string;
  readonly done: boolean;
}

export interface Materiality {
  readonly benchmark: string;
  readonly benchmarkValue: number;
  readonly percentage: number;
  readonly overall: number;
  readonly performance: number;
  readonly trivialThreshold: number;
}

export interface AuditAdjustment {
  readonly id: string;
  readonly description: string;
  readonly account: string;
  readonly amount: number;
  readonly status: 'proposed' | 'accepted' | 'waived';
}

export const ADJUSTMENT_STATUS_META: Record<AuditAdjustment['status'], StatusMeta> = {
  proposed: { label: 'Proposto', tone: 'warning' },
  accepted: { label: 'Aceito pelo cliente', tone: 'success' },
  waived: { label: 'Não registrado', tone: 'neutral' },
};

/** Tipo de trabalho. Compõe o rótulo curto ("Auditoria das DFs 2026") e é dimensão de estratificação. */
export type EngagementType = 'financial_statements' | 'interim_review';

export const ENGAGEMENT_TYPE_LABELS: Record<EngagementType, string> = {
  financial_statements: 'Auditoria das DFs',
  interim_review: 'Revisão de ITR',
};

export interface Engagement {
  readonly id: string;
  /** Chave canônica do cliente (catálogo de clientes). */
  readonly clientId: string;
  /** Nome do cliente para exibição; deve coincidir com o nome do cliente em `clientId`. */
  readonly client: string;
  readonly type: EngagementType;
  readonly title: string;
  readonly fiscalYear: number;
  readonly partnerId: string;
  readonly seniorId: string;
  readonly status: EngagementStatus;
  readonly progress: number;
  readonly risk: RiskLevel;
  readonly startDate: string;
  readonly reportDueDate: string;
  readonly scope: string;
  readonly milestones: readonly Milestone[];
  readonly risks: readonly EngagementRisk[];
  readonly materiality: Materiality | null;
  readonly adjustments: readonly AuditAdjustment[];
  readonly conclusion: string | null;
}

/**
 * Identidade de um trabalho no catálogo compartilhado. Cobre os trabalhos operacionais
 * (registro completo, tela própria) e os históricos, conhecidos apenas pelas observações
 * estatísticas de Qualidade — estes nunca contam como trabalhos ativos.
 */
export interface EngagementIdentity {
  readonly id: string;
  readonly clientId: string;
  readonly type: EngagementType;
  readonly fiscalYear: number;
  readonly title: string;
  readonly recordKind: RecordKind;
  /** Somente trabalhos operacionais têm status no fluxo. */
  readonly status?: EngagementStatus;
}

export function toEngagementIdentity(engagement: Engagement): EngagementIdentity {
  return {
    id: engagement.id,
    clientId: engagement.clientId,
    type: engagement.type,
    fiscalYear: engagement.fiscalYear,
    title: engagement.title,
    recordKind: 'operational',
    status: engagement.status,
  };
}

/** "Auditoria das DFs 2026", "Revisão de ITR 2026". */
export function engagementShortTitle(
  engagement: Pick<EngagementIdentity, 'type' | 'fiscalYear'>,
): string {
  return `${ENGAGEMENT_TYPE_LABELS[engagement.type]} ${engagement.fiscalYear}`;
}
