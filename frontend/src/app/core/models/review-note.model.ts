import { StatusMeta } from './status.model';

export type ReviewNoteSeverity = 'low' | 'medium' | 'high' | 'critical';

export const REVIEW_NOTE_SEVERITY_META: Record<ReviewNoteSeverity, StatusMeta> = {
  low: { label: 'Baixa', tone: 'neutral' },
  medium: { label: 'Média', tone: 'warning' },
  high: { label: 'Alta', tone: 'danger' },
  critical: { label: 'Crítica', tone: 'danger' },
};

export type ReviewNoteStatus = 'open' | 'resolved';

export const REVIEW_NOTE_STATUS_META: Record<ReviewNoteStatus, StatusMeta> = {
  open: { label: 'Aberto', tone: 'warning' },
  resolved: { label: 'Resolvido', tone: 'success' },
};

/**
 * Ponto de revisão estruturado, sempre ligado a um ciclo. Resolver não apaga: o ponto
 * permanece no histórico com quem resolveu e quando. Projeção do histórico de eventos.
 */
export interface ReviewNote {
  readonly id: string;
  readonly workpaperId: string;
  readonly engagementId: string;
  readonly reviewCycleId: string;
  readonly createdBy: string;
  /** Responsável pela correção (o preparador do PTA). */
  readonly assignedTo: string;
  readonly createdAt: string;
  readonly description: string;
  readonly severity: ReviewNoteSeverity;
  readonly status: ReviewNoteStatus;
  readonly resolvedAt?: string;
  readonly resolvedBy?: string;
  readonly resolution?: string;
}
