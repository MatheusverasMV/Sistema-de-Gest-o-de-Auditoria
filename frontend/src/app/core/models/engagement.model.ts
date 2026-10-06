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

export interface Engagement {
  readonly id: string;
  readonly client: string;
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
