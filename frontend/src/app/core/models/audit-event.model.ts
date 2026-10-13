import { BoardColumnId } from './board.model';
import { EntityType } from './entity.model';
import { WorkpaperStatus } from './workpaper.model';

/*
 * Contrato preliminar do histórico de eventos (Incremento 01: só tipos e validação básica).
 * Não há motor de eventos nem event sourcing: o estado atual continua nos repositórios.
 *
 * Distinção central:
 * - Evento FORMAL: ato técnico do fluxo de revisão, registrado no SGA por quem tem a
 *   responsabilidade (ex.: REVIEW_APPROVED). É o que alimentará as métricas de Qualidade.
 * - Evento OPERACIONAL: movimentação de organização do trabalho (ex.: cartão movido no
 *   Kanban ou no Trello). Indica intenção ou contexto, nunca equivale a um ato formal.
 *   "Cartão movido para Em revisão" não significa que o revisor iniciou a análise.
 */

export type EventSource = 'sga' | 'trello' | 'import';

export type EventNature = 'formal' | 'operational';

/** Eventos formais do ciclo de vida do PTA (nomes não colidem com os status atuais). */
export type WorkpaperEventType =
  | 'WORKPAPER_CREATED'
  | 'PREPARATION_STARTED'
  | 'SUBMITTED_FOR_REVIEW'
  | 'REVIEW_STARTED'
  | 'REVIEW_NOTE_CREATED'
  | 'REVIEW_NOTE_RESOLVED'
  | 'RETURNED_FOR_CORRECTION'
  | 'RESUBMITTED'
  | 'REVIEW_APPROVED'
  | 'WORKPAPER_FINALIZED'
  | 'WORKPAPER_REOPENED';

/** Eventos operacionais de organização do trabalho. */
export type BoardCardEventType = 'BOARD_CARD_CREATED' | 'BOARD_CARD_MOVED' | 'BOARD_CARD_ASSIGNED';

export type AuditEventType = WorkpaperEventType | BoardCardEventType;

export const EVENT_NATURE: Readonly<Record<AuditEventType, EventNature>> = {
  WORKPAPER_CREATED: 'formal',
  PREPARATION_STARTED: 'formal',
  SUBMITTED_FOR_REVIEW: 'formal',
  REVIEW_STARTED: 'formal',
  REVIEW_NOTE_CREATED: 'formal',
  REVIEW_NOTE_RESOLVED: 'formal',
  RETURNED_FOR_CORRECTION: 'formal',
  RESUBMITTED: 'formal',
  REVIEW_APPROVED: 'formal',
  WORKPAPER_FINALIZED: 'formal',
  WORKPAPER_REOPENED: 'formal',
  BOARD_CARD_CREATED: 'operational',
  BOARD_CARD_MOVED: 'operational',
  BOARD_CARD_ASSIGNED: 'operational',
};

interface AuditEventBase<TType extends AuditEventType, TEntity extends EntityType, TPayload> {
  readonly id: string;
  readonly eventType: TType;
  readonly entityType: TEntity;
  readonly entityId: string;
  /** Trabalho a que o evento pertence (desnormalizado para recortes e métricas). */
  readonly engagementId?: string;
  /** Quando o fato aconteceu na origem (ISO 8601). */
  readonly occurredAt: string;
  /** Quando o SGA registrou o fato; ≥ occurredAt (importações chegam depois). */
  readonly recordedAt: string;
  readonly actorId?: string;
  readonly source: EventSource;
  /** Id do evento na origem externa (ex.: action do Trello), para idempotência. */
  readonly externalEventId?: string;
  readonly payload: TPayload;
}

export interface WorkpaperEventPayload {
  /** Status do PTA antes/depois, quando o evento muda o status. */
  readonly fromStatus?: WorkpaperStatus;
  readonly toStatus?: WorkpaperStatus;
  /** Review note envolvido (REVIEW_NOTE_CREATED / REVIEW_NOTE_RESOLVED). */
  readonly reviewNoteId?: string;
  readonly comment?: string;
}

export interface BoardCardEventPayload {
  readonly boardId: string;
  readonly fromColumn?: BoardColumnId;
  readonly toColumn?: BoardColumnId;
  readonly assigneeId?: string;
}

export type WorkpaperEvent = AuditEventBase<WorkpaperEventType, 'workpaper', WorkpaperEventPayload>;

export type BoardCardEvent = AuditEventBase<
  BoardCardEventType,
  'board_card',
  BoardCardEventPayload
>;

export type AuditEvent = WorkpaperEvent | BoardCardEvent;

export function eventNature(event: AuditEvent): EventNature {
  return EVENT_NATURE[event.eventType];
}
