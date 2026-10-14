import {
  isWorkpaperEvent,
  ReviewCycleResult,
  ReviewNoteSeverity,
  ReviewNoteStatus,
  Workpaper,
  WorkpaperStatus,
} from '../models';
import { WorkflowLog } from './workflow-log';
import { reconstituteWorkpaper, WorkpaperWorkflowState } from './workpaper-workflow';

/*
 * Projeções do histórico de eventos. Todas são funções puras do log: nada aqui é gravado.
 */

/** Estado formal de um PTA: eventos aplicados sobre o status herdado. */
export function workflowStateOf(
  workpaper: Pick<Workpaper, 'id' | 'status'>,
  log: WorkflowLog,
): WorkpaperWorkflowState {
  const baseline = log.baselines[workpaper.id]?.status ?? workpaper.status;
  return reconstituteWorkpaper(workpaper.id, baseline, log.events);
}

/** PTA com o status formal do histórico (sem histórico ⇒ inalterado). */
export function projectWorkpaper(workpaper: Workpaper, log: WorkflowLog): Workpaper {
  if (!log.baselines[workpaper.id]) {
    return workpaper;
  }
  const state = workflowStateOf(workpaper, log);
  const lastEvent = state.events[state.events.length - 1];
  return {
    ...workpaper,
    status: state.status,
    updatedAt:
      lastEvent && lastEvent.occurredAt > workpaper.updatedAt
        ? lastEvent.occurredAt
        : workpaper.updatedAt,
  };
}

/** Para a projeção do Kanban: status formal e último evento formal aplicado, por PTA. */
export interface FormalProjection {
  readonly status: WorkpaperStatus;
  readonly eventId: string;
}

export function formalProjections(log: WorkflowLog): ReadonlyMap<string, FormalProjection> {
  const projections = new Map<string, FormalProjection>();
  for (const [workpaperId, baseline] of Object.entries(log.baselines)) {
    const state = reconstituteWorkpaper(workpaperId, baseline.status, log.events);
    if (state.lastAppliedEventId) {
      projections.set(workpaperId, { status: state.status, eventId: state.lastAppliedEventId });
    }
  }
  return projections;
}

// ------------------------------------------------------------------ contrato para Qualidade (02B)

/** Dimensões de recorte de um PTA, resolvidas pelo chamador no catálogo canônico. */
export interface WorkpaperDimensions {
  readonly workpaperId: string;
  readonly engagementId: string;
  readonly clientId?: string;
  readonly auditArea?: string;
  readonly preparerId?: string;
  readonly reviewerId?: string;
}

/** Um ciclo de revisão registrado, pronto para virar observação estatística. */
export interface ReviewCycleFact extends WorkpaperDimensions {
  readonly cycleId: string;
  readonly sequence: number;
  readonly origin: 'recorded' | 'legacy';
  readonly submittedAt?: string;
  readonly reviewStartedAt?: string;
  readonly completedAt?: string;
  readonly result: ReviewCycleResult;
  readonly cycleReviewerId?: string;
  readonly notesCreated: number;
}

export interface ReviewNoteFact extends WorkpaperDimensions {
  readonly reviewNoteId: string;
  readonly cycleId: string;
  readonly severity: ReviewNoteSeverity;
  readonly status: ReviewNoteStatus;
  readonly createdAt: string;
  readonly resolvedAt?: string;
}

export interface WorkflowFacts {
  readonly cycles: readonly ReviewCycleFact[];
  readonly notes: readonly ReviewNoteFact[];
}

/**
 * Fatos do fluxo formal para o Incremento 02B (tempo de ciclo, retrabalho, review notes,
 * resolução). Só eventos realmente registrados — nunca mistura o mock estatístico.
 * Ciclos `legacy` não têm data de envio e devem ser excluídos das medidas de tempo.
 */
export function workflowFacts(
  log: WorkflowLog,
  dimensionsOf: (workpaperId: string) => WorkpaperDimensions | undefined,
): WorkflowFacts {
  const cycles: ReviewCycleFact[] = [];
  const notes: ReviewNoteFact[] = [];
  const workpaperIds = new Set(log.events.filter(isWorkpaperEvent).map((e) => e.entityId));
  for (const workpaperId of [...workpaperIds].sort()) {
    const baseline = log.baselines[workpaperId];
    const dimensions = dimensionsOf(workpaperId);
    if (!baseline || !dimensions) continue;
    const state = reconstituteWorkpaper(workpaperId, baseline.status, log.events);
    for (const cycle of state.cycles) {
      cycles.push({
        ...dimensions,
        cycleId: cycle.id,
        sequence: cycle.sequence,
        origin: cycle.origin,
        submittedAt: cycle.submittedAt,
        reviewStartedAt: cycle.reviewStartedAt,
        completedAt: cycle.completedAt,
        result: cycle.result,
        cycleReviewerId: cycle.reviewerId,
        notesCreated: state.notes.filter((n) => n.reviewCycleId === cycle.id).length,
      });
    }
    for (const note of state.notes) {
      notes.push({
        ...dimensions,
        reviewNoteId: note.id,
        cycleId: note.reviewCycleId,
        severity: note.severity,
        status: note.status,
        createdAt: note.createdAt,
        resolvedAt: note.resolvedAt,
      });
    }
  }
  return { cycles, notes };
}
