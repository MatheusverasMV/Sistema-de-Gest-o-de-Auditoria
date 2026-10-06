import { StatusMeta } from './status.model';

export type WorkpaperStatus =
  'not_started' | 'in_preparation' | 'awaiting_review' | 'in_review' | 'with_issues' | 'finalized';

export const WORKPAPER_STATUS_META: Record<WorkpaperStatus, StatusMeta> = {
  not_started: { label: 'Não iniciado', tone: 'neutral' },
  in_preparation: { label: 'Em preparação', tone: 'info' },
  awaiting_review: { label: 'Aguardando revisão', tone: 'warning' },
  in_review: { label: 'Em revisão', tone: 'brand' },
  with_issues: { label: 'Com pendência', tone: 'danger' },
  finalized: { label: 'Finalizado', tone: 'success' },
};

/** Fluxo principal do PTA, na ordem em que é percorrido. */
export const WORKPAPER_MAIN_FLOW: readonly WorkpaperStatus[] = [
  'not_started',
  'in_preparation',
  'awaiting_review',
  'in_review',
  'finalized',
];

export const OPEN_WORKPAPER_STATUSES: readonly WorkpaperStatus[] = [
  'not_started',
  'in_preparation',
  'awaiting_review',
  'in_review',
  'with_issues',
];

export function canSubmitForReview(status: WorkpaperStatus): boolean {
  return status === 'in_preparation' || status === 'with_issues';
}

export interface Procedure {
  readonly id: string;
  readonly description: string;
  readonly done: boolean;
  /** Automação sugerida para executar o procedimento. */
  readonly automationId?: string;
}

export type ExceptionSeverity = 'low' | 'medium' | 'high';

export const EXCEPTION_SEVERITY_META: Record<ExceptionSeverity, StatusMeta> = {
  low: { label: 'Baixa', tone: 'neutral' },
  medium: { label: 'Média', tone: 'warning' },
  high: { label: 'Alta', tone: 'danger' },
};

export interface WorkpaperException {
  readonly id: string;
  readonly description: string;
  readonly amount: number;
  readonly severity: ExceptionSeverity;
  readonly resolved: boolean;
}

export interface Evidence {
  readonly id: string;
  readonly name: string;
  readonly kind: 'file' | 'automation';
  readonly addedById: string;
  readonly addedAt: string;
  readonly description?: string;
  readonly executionId?: string;
}

export interface ReviewNote {
  readonly id: string;
  readonly authorId: string;
  readonly date: string;
  readonly text: string;
  readonly resolved: boolean;
}

export interface Workpaper {
  readonly id: string;
  readonly engagementId: string;
  readonly area: string;
  readonly title: string;
  readonly preparerId: string;
  readonly reviewerId: string;
  readonly status: WorkpaperStatus;
  readonly date: string;
  readonly updatedAt: string;
  readonly objective: string;
  readonly basis: readonly string[];
  readonly procedures: readonly Procedure[];
  readonly results: string;
  readonly exceptions: readonly WorkpaperException[];
  readonly evidences: readonly Evidence[];
  readonly conclusion: string;
  readonly reviewNotes: readonly ReviewNote[];
}
