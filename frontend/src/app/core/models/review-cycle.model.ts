import { StatusMeta } from './status.model';

/** Resultado de uma rodada formal de revisão. */
export type ReviewCycleResult = 'in_progress' | 'returned' | 'approved';

export const REVIEW_CYCLE_RESULT_META: Record<ReviewCycleResult, StatusMeta> = {
  in_progress: { label: 'Em andamento', tone: 'info' },
  returned: { label: 'Devolvido', tone: 'danger' },
  approved: { label: 'Aprovado', tone: 'success' },
};

/**
 * Rodada formal de revisão de um PTA: começa no envio (ou reenvio) e termina na
 * devolução ou na aprovação. Projeção do histórico de eventos — nunca é editada.
 */
export interface ReviewCycle {
  /** `RC-<PTA>-<n>`; nunca reaproveitado entre ciclos. */
  readonly id: string;
  readonly workpaperId: string;
  readonly engagementId: string;
  /** 1 para o primeiro ciclo, 2 após o primeiro reenvio, … */
  readonly sequence: number;
  /**
   * `recorded`: ciclo aberto por evento de envio registrado no SGA.
   * `legacy`: o PTA já estava em revisão no mock; o envio é anterior ao histórico.
   */
  readonly origin: 'recorded' | 'legacy';
  readonly submittedAt?: string;
  readonly submittedBy?: string;
  readonly reviewStartedAt?: string;
  readonly reviewerId?: string;
  readonly completedAt?: string;
  readonly completedBy?: string;
  readonly result: ReviewCycleResult;
  readonly returnReason?: string;
}
