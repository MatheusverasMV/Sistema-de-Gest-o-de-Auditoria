import {
  AUDIT_EVENT_SCHEMA_VERSION,
  AuditEvent,
  isWorkpaperEvent,
  ReviewCycle,
  ReviewNote,
  ReviewNoteSeverity,
  Workpaper,
  WorkpaperEvent,
  WorkpaperEventPayloads,
  WorkpaperEventType,
  WorkpaperStatus,
} from '../models';

/*
 * Workflow formal do PTA — funções puras, sem Angular.
 *
 *   1. Máquina de estados: quais transições de status existem.
 *   2. Reconstituição: estado, ciclos e review notes derivados do histórico de eventos.
 *   3. Comandos: valida um ato formal (estado, autor, pré-condições) e produz os eventos.
 *
 * O serviço WorkpaperWorkflowService é a única porta de entrada para executar comandos.
 */

// ------------------------------------------------------------------ 1. máquina de estados

export const WORKPAPER_TRANSITIONS: Readonly<Record<WorkpaperStatus, readonly WorkpaperStatus[]>> =
  {
    not_started: ['in_preparation'],
    in_preparation: ['awaiting_review'],
    awaiting_review: ['in_review'],
    in_review: ['with_issues', 'finalized'],
    // A correção acontece em preparação; o reenvio sai de lá.
    with_issues: ['in_preparation'],
    // Reabertura exigirá operação própria e autorizada (fora deste incremento).
    finalized: [],
  };

export function canTransition(from: WorkpaperStatus, to: WorkpaperStatus): boolean {
  return WORKPAPER_TRANSITIONS[from].includes(to);
}

/** Status de destino dos eventos que mudam o status; os demais não alteram o status. */
export const EVENT_TARGET_STATUS: Readonly<Partial<Record<WorkpaperEventType, WorkpaperStatus>>> = {
  PREPARATION_STARTED: 'in_preparation',
  SUBMITTED_FOR_REVIEW: 'awaiting_review',
  RESUBMITTED: 'awaiting_review',
  REVIEW_STARTED: 'in_review',
  RETURNED_FOR_CORRECTION: 'with_issues',
  WORKPAPER_FINALIZED: 'finalized',
};

// ------------------------------------------------------------------ 2. reconstituição

/** Ordem determinística: ocorrência, depois ordem de registro, depois id. */
export function compareEvents(a: AuditEvent, b: AuditEvent): number {
  return (
    a.occurredAt.localeCompare(b.occurredAt) || a.sequence - b.sequence || a.id.localeCompare(b.id)
  );
}

export function orderEvents<T extends AuditEvent>(events: readonly T[]): T[] {
  return [...events].sort(compareEvents);
}

/** Evento do histórico que não pôde ser aplicado (fora de ordem, inconsistente ou não suportado). */
export interface WorkflowAnomaly {
  readonly eventId: string;
  readonly eventType: WorkpaperEventType;
  readonly reason: string;
}

export interface WorkpaperWorkflowState {
  readonly workpaperId: string;
  /** Status herdado do mock quando o PTA entrou no histórico (ou atual, se nunca entrou). */
  readonly baselineStatus: WorkpaperStatus;
  readonly status: WorkpaperStatus;
  /** Há eventos formais registrados para o PTA. */
  readonly hasHistory: boolean;
  /** Eventos formais do PTA, na ordem determinística (inclui os não aplicados). */
  readonly events: readonly WorkpaperEvent[];
  readonly cycles: readonly ReviewCycle[];
  readonly notes: readonly ReviewNote[];
  readonly activeCycle: ReviewCycle | null;
  /** Último evento aplicado: usado pela projeção do Kanban. */
  readonly lastAppliedEventId: string | null;
  readonly anomalies: readonly WorkflowAnomaly[];
}

/**
 * Reconstrói o estado formal de um PTA aplicando seus eventos sobre o status herdado.
 * Eventos que violam a máquina de estados não são aplicados e viram anomalias: um evento
 * antigo ou importado fora de ordem nunca substitui silenciosamente um estado mais recente.
 */
export function reconstituteWorkpaper(
  workpaperId: string,
  baselineStatus: WorkpaperStatus,
  log: readonly AuditEvent[],
): WorkpaperWorkflowState {
  const events = orderEvents(
    log.filter(isWorkpaperEvent).filter((e) => e.entityId === workpaperId),
  );
  let status = baselineStatus;
  const cycles: ReviewCycle[] = [];
  const notes: ReviewNote[] = [];
  const anomalies: WorkflowAnomaly[] = [];
  let lastAppliedEventId: string | null = null;

  const active = () => {
    const last = cycles[cycles.length - 1];
    return last?.result === 'in_progress' ? last : null;
  };
  const replaceCycle = (cycle: ReviewCycle) => {
    cycles[cycles.findIndex((c) => c.id === cycle.id)] = cycle;
  };
  /** Ciclo ativo; para PTAs que já estavam em revisão no mock, abre o ciclo herdado. */
  const cycleFor = (event: WorkpaperEvent): ReviewCycle | string => {
    const current = active();
    if (current) {
      return current.id === event.reviewCycleId ? current : 'Evento não pertence ao ciclo ativo.';
    }
    const inheritedReview =
      cycles.length === 0 &&
      status === baselineStatus &&
      (status === 'awaiting_review' || status === 'in_review');
    if (!inheritedReview || !event.reviewCycleId) {
      return 'Não há ciclo de revisão ativo.';
    }
    const legacy: ReviewCycle = {
      id: event.reviewCycleId,
      workpaperId,
      engagementId: event.engagementId,
      sequence: 1,
      origin: 'legacy',
      result: 'in_progress',
    };
    cycles.push(legacy);
    return legacy;
  };

  const apply = (event: WorkpaperEvent): string | null => {
    const target = EVENT_TARGET_STATUS[event.eventType];
    if (target && !canTransition(status, target)) {
      return `Transição ${status} → ${target} não permitida.`;
    }
    switch (event.eventType) {
      case 'WORKPAPER_CREATED':
        return status === 'not_started' ? null : 'PTA já existente.';
      case 'PREPARATION_STARTED':
        status = 'in_preparation';
        return null;
      case 'SUBMITTED_FOR_REVIEW':
      case 'RESUBMITTED': {
        const previous = cycles[cycles.length - 1];
        const isResubmission =
          previous?.result === 'returned' ||
          (cycles.length === 0 && baselineStatus === 'with_issues');
        if (isResubmission !== (event.eventType === 'RESUBMITTED')) {
          return isResubmission
            ? 'Após devolução o envio é um reenvio.'
            : 'Não há devolução anterior.';
        }
        if (!event.reviewCycleId || cycles.some((c) => c.id === event.reviewCycleId)) {
          return 'Identificador de ciclo ausente ou reutilizado.';
        }
        cycles.push({
          id: event.reviewCycleId,
          workpaperId,
          engagementId: event.engagementId,
          sequence: cycles.length + 1,
          origin: 'recorded',
          submittedAt: event.occurredAt,
          submittedBy: event.actorId,
          result: 'in_progress',
        });
        status = 'awaiting_review';
        return null;
      }
      case 'REVIEW_STARTED': {
        const cycle = cycleFor(event);
        if (typeof cycle === 'string') return cycle;
        replaceCycle({ ...cycle, reviewStartedAt: event.occurredAt, reviewerId: event.actorId });
        status = 'in_review';
        return null;
      }
      case 'REVIEW_NOTE_CREATED': {
        if (status !== 'in_review') return 'Pontos de revisão só são registrados em revisão.';
        const cycle = cycleFor(event);
        if (typeof cycle === 'string') return cycle;
        const { reviewNoteId, description, severity, assignedTo } = event.payload;
        if (notes.some((n) => n.id === reviewNoteId)) return 'Ponto de revisão duplicado.';
        notes.push({
          id: reviewNoteId,
          workpaperId,
          engagementId: event.engagementId,
          reviewCycleId: cycle.id,
          createdBy: event.actorId ?? '',
          assignedTo,
          createdAt: event.occurredAt,
          description,
          severity,
          status: 'open',
        });
        return null;
      }
      case 'REVIEW_NOTE_RESOLVED': {
        const index = notes.findIndex((n) => n.id === event.payload.reviewNoteId);
        if (index === -1 || notes[index].status !== 'open')
          return 'Ponto inexistente ou já resolvido.';
        if (status === 'finalized') return 'PTA finalizado.';
        notes[index] = {
          ...notes[index],
          status: 'resolved',
          resolvedAt: event.occurredAt,
          resolvedBy: event.actorId,
          resolution: event.payload.resolution,
        };
        return null;
      }
      case 'RETURNED_FOR_CORRECTION': {
        const cycle = cycleFor(event);
        if (typeof cycle === 'string') return cycle;
        replaceCycle({
          ...cycle,
          result: 'returned',
          completedAt: event.occurredAt,
          completedBy: event.actorId,
          returnReason: event.payload.reason,
        });
        status = 'with_issues';
        return null;
      }
      case 'REVIEW_APPROVED': {
        if (status !== 'in_review') return 'Aprovação só é possível em revisão.';
        const cycle = cycleFor(event);
        if (typeof cycle === 'string') return cycle;
        if (notes.some((n) => n.status === 'open')) return 'Há pontos de revisão em aberto.';
        replaceCycle({
          ...cycle,
          result: 'approved',
          completedAt: event.occurredAt,
          completedBy: event.actorId,
        });
        return null;
      }
      case 'WORKPAPER_FINALIZED': {
        const last = cycles[cycles.length - 1];
        if (last?.result !== 'approved' || last.id !== event.reviewCycleId) {
          return 'Finalização exige o ciclo aprovado.';
        }
        status = 'finalized';
        return null;
      }
      case 'WORKPAPER_REOPENED':
        return 'Reabertura não suportada nesta versão.';
    }
  };

  for (const event of events) {
    const error = apply(event);
    if (error) {
      anomalies.push({ eventId: event.id, eventType: event.eventType, reason: error });
    } else {
      lastAppliedEventId = event.id;
    }
  }

  return {
    workpaperId,
    baselineStatus,
    status,
    hasHistory: events.length > 0,
    events,
    cycles,
    notes,
    activeCycle: active(),
    lastAppliedEventId,
    anomalies,
  };
}

// ------------------------------------------------------------------ 3. comandos

export type WorkflowCommand =
  /** Iniciar a preparação, ou retomá-la após devolução. */
  | { readonly type: 'start_preparation' }
  /** Enviar para revisão; após devolução, é registrado como reenvio. */
  | { readonly type: 'submit' }
  | { readonly type: 'start_review' }
  | {
      readonly type: 'create_note';
      readonly description: string;
      readonly severity: ReviewNoteSeverity;
    }
  | { readonly type: 'resolve_note'; readonly noteId: string; readonly resolution?: string }
  | { readonly type: 'return'; readonly reason: string }
  /** Aprova a revisão e finaliza o PTA (uma operação lógica, dois eventos). */
  | { readonly type: 'approve' };

export type WorkflowCommandType = WorkflowCommand['type'];

export type WorkflowErrorCode =
  | 'no_actor'
  | 'not_authorized'
  | 'invalid_transition'
  | 'precondition_failed'
  | 'not_found'
  | 'conflict'
  | 'storage_failure'
  | 'corrupted_storage';

/** Erro de domínio do workflow: nenhuma alteração foi gravada. */
export class WorkflowError extends Error {
  constructor(
    readonly code: WorkflowErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

export type WorkflowRole = 'preparer' | 'reviewer';

/** Quem pode praticar cada ato (atribuição já existente no PTA: preparador e revisor). */
export const COMMAND_ROLE: Readonly<Record<WorkflowCommandType, WorkflowRole>> = {
  start_preparation: 'preparer',
  submit: 'preparer',
  resolve_note: 'preparer',
  start_review: 'reviewer',
  create_note: 'reviewer',
  return: 'reviewer',
  approve: 'reviewer',
};

/** Status em que cada comando faz sentido. */
export const COMMAND_STATUSES: Readonly<Record<WorkflowCommandType, readonly WorkpaperStatus[]>> = {
  start_preparation: ['not_started', 'with_issues'],
  submit: ['in_preparation'],
  start_review: ['awaiting_review'],
  create_note: ['in_review'],
  resolve_note: ['with_issues', 'in_preparation'],
  return: ['in_review'],
  approve: ['in_review'],
};

export interface CommandContext {
  readonly workpaper: Pick<Workpaper, 'id' | 'engagementId' | 'preparerId' | 'reviewerId'>;
  readonly state: WorkpaperWorkflowState;
  /** Usuário da sessão; nunca informado pela tela. */
  readonly actorId: string | null;
}

/**
 * Verifica se o comando pode ser executado agora (estado, autor e pré-condições).
 * Devolve o erro de domínio ou null. Não depende de dados digitados pelo usuário,
 * exceto quando o comando é informado por completo.
 */
export function checkCommand(
  command: WorkflowCommand | WorkflowCommandType,
  context: CommandContext,
): WorkflowError | null {
  const type = typeof command === 'string' ? command : command.type;
  const full = typeof command === 'string' ? null : command;
  const { workpaper, state, actorId } = context;

  if (!COMMAND_STATUSES[type].includes(state.status)) {
    return new WorkflowError('invalid_transition', `Ação indisponível no status atual do PTA.`);
  }
  if (state.anomalies.length) {
    return new WorkflowError(
      'precondition_failed',
      'O histórico deste PTA tem eventos inconsistentes; regularize antes de prosseguir.',
    );
  }
  if (!actorId) {
    return new WorkflowError('no_actor', 'Nenhum usuário identificado na sessão.');
  }
  const role = COMMAND_ROLE[type];
  if (role === 'preparer' && actorId !== workpaper.preparerId) {
    return new WorkflowError('not_authorized', 'Ação reservada ao preparador do PTA.');
  }
  if (
    role === 'reviewer' &&
    (actorId !== workpaper.reviewerId || actorId === workpaper.preparerId)
  ) {
    return new WorkflowError('not_authorized', 'Ação reservada ao revisor do PTA.');
  }

  const openNotes = state.notes.filter((n) => n.status === 'open');
  switch (type) {
    case 'submit':
      if (openNotes.length) {
        return new WorkflowError(
          'precondition_failed',
          `Resolva os ${openNotes.length} ponto(s) de revisão em aberto antes de reenviar.`,
        );
      }
      break;
    case 'approve':
      if (openNotes.length) {
        return new WorkflowError(
          'precondition_failed',
          `Há ${openNotes.length} ponto(s) de revisão em aberto: devolva o PTA ou aguarde a resolução.`,
        );
      }
      break;
    case 'create_note':
      if (full?.type === 'create_note' && !full.description.trim()) {
        return new WorkflowError('precondition_failed', 'Descreva o ponto de revisão.');
      }
      break;
    case 'resolve_note':
      if (full?.type === 'resolve_note' && !openNotes.some((n) => n.id === full.noteId)) {
        return new WorkflowError('not_found', 'Ponto de revisão inexistente ou já resolvido.');
      }
      break;
    case 'return': {
      const cycleNotes = openNotes.filter((n) => n.reviewCycleId === state.activeCycle?.id);
      if (full?.type === 'return' && !full.reason.trim() && cycleNotes.length === 0) {
        return new WorkflowError(
          'precondition_failed',
          'Informe a justificativa ou registre ao menos um ponto de revisão antes de devolver.',
        );
      }
      break;
    }
  }
  return null;
}

export interface EventDraftContext {
  /** Instante da operação (ISO 8601 UTC); occurredAt e recordedAt coincidem no SGA. */
  readonly now: string;
  /** Próximo número de sequência do log. */
  readonly nextSequence: number;
}

export type CommandDecision =
  | { readonly ok: true; readonly events: readonly WorkpaperEvent[] }
  | { readonly ok: false; readonly error: WorkflowError };

/** Valida o comando e produz os eventos formais da operação (sem gravar nada). */
export function decideCommand(
  command: WorkflowCommand,
  context: CommandContext,
  draft: EventDraftContext,
): CommandDecision {
  const error = checkCommand(command, context);
  if (error) {
    return { ok: false, error };
  }
  const { workpaper, state, actorId } = context;
  let sequence = draft.nextSequence;
  const correlationId = eventId(draft.nextSequence);
  const make = <K extends WorkpaperEventType>(
    eventType: K,
    payload: WorkpaperEventPayloads[K],
    extra: { reviewCycleId?: string; causationId?: string } = {},
  ): WorkpaperEvent => {
    const current = sequence++;
    return {
      id: eventId(current),
      schemaVersion: AUDIT_EVENT_SCHEMA_VERSION,
      sequence: current,
      eventType,
      eventCategory: 'formal',
      entityType: 'workpaper',
      entityId: workpaper.id,
      engagementId: workpaper.engagementId,
      workpaperId: workpaper.id,
      actorId: actorId!,
      occurredAt: draft.now,
      recordedAt: draft.now,
      source: 'sga',
      correlationId,
      payload,
      ...extra,
    } as WorkpaperEvent;
  };
  const cycleId = state.activeCycle?.id ?? cycleIdFor(workpaper.id, state.cycles.length + 1);

  switch (command.type) {
    case 'start_preparation':
      return ok([make('PREPARATION_STARTED', { fromStatus: state.status })]);
    case 'submit': {
      const previous = state.cycles[state.cycles.length - 1];
      const resubmission =
        previous?.result === 'returned' ||
        (state.cycles.length === 0 && state.baselineStatus === 'with_issues');
      const newCycleId = cycleIdFor(workpaper.id, state.cycles.length + 1);
      return ok([
        resubmission
          ? make(
              'RESUBMITTED',
              { reviewerId: workpaper.reviewerId, previousCycleId: previous?.id },
              { reviewCycleId: newCycleId },
            )
          : make(
              'SUBMITTED_FOR_REVIEW',
              { reviewerId: workpaper.reviewerId },
              { reviewCycleId: newCycleId },
            ),
      ]);
    }
    case 'start_review':
      return ok([make('REVIEW_STARTED', {}, { reviewCycleId: cycleId })]);
    case 'create_note':
      return ok([
        make(
          'REVIEW_NOTE_CREATED',
          {
            reviewNoteId: noteIdFor(sequence),
            description: command.description.trim(),
            severity: command.severity,
            assignedTo: workpaper.preparerId,
          },
          { reviewCycleId: cycleId },
        ),
      ]);
    case 'resolve_note': {
      const note = state.notes.find((n) => n.id === command.noteId)!;
      const resolution = command.resolution?.trim();
      return ok([
        make(
          'REVIEW_NOTE_RESOLVED',
          resolution ? { reviewNoteId: note.id, resolution } : { reviewNoteId: note.id },
          { reviewCycleId: note.reviewCycleId },
        ),
      ]);
    }
    case 'return': {
      const open = state.notes
        .filter((n) => n.status === 'open' && n.reviewCycleId === cycleId)
        .map((n) => n.id);
      const reason = command.reason.trim() || `${open.length} ponto(s) de revisão em aberto.`;
      return ok([
        make(
          'RETURNED_FOR_CORRECTION',
          { reason, openReviewNoteIds: open },
          { reviewCycleId: cycleId },
        ),
      ]);
    }
    case 'approve': {
      const approved = make('REVIEW_APPROVED', {}, { reviewCycleId: cycleId });
      const finalized = make(
        'WORKPAPER_FINALIZED',
        {},
        { reviewCycleId: cycleId, causationId: approved.id },
      );
      return ok([approved, finalized]);
    }
  }
}

function ok(events: readonly WorkpaperEvent[]): CommandDecision {
  return { ok: true, events };
}

export function eventId(sequence: number): string {
  return `EV-${String(sequence).padStart(6, '0')}`;
}

export function cycleIdFor(workpaperId: string, sequence: number): string {
  return `RC-${workpaperId}-${sequence}`;
}

/** Pontos novos usam a sequência do evento de criação: únicos e distintos dos herdados (RN-01). */
export function noteIdFor(sequence: number): string {
  return `RVN-${String(sequence).padStart(6, '0')}`;
}
