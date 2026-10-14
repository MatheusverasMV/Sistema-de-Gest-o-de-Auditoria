import { BoardColumnId } from './board.model';
import { EntityType } from './entity.model';
import { ReviewNoteSeverity } from './review-note.model';
import { WorkpaperStatus } from './workpaper.model';

/*
 * Histórico de eventos (event log simplificado, append-only). Cada evento é imutável:
 * mudanças de estado são novos eventos, nunca edições. O estado formal do PTA, os ciclos
 * de revisão e os review notes são projeções puras deste log (ver workpaper-workflow.ts).
 *
 * Distinção central:
 * - Evento FORMAL: ato técnico do fluxo de revisão, registrado no SGA por quem tem a
 *   responsabilidade (ex.: REVIEW_APPROVED). Alimentará as métricas de Qualidade.
 * - Evento OPERACIONAL: organização do trabalho (ex.: cartão movido no Kanban ou no
 *   Trello). Nunca equivale a um ato formal: "cartão em Em revisão" não significa que o
 *   revisor iniciou a análise, e "cartão em Concluído" não aprova o PTA.
 */

export const AUDIT_EVENT_SCHEMA_VERSION = 1;

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

type EmptyPayload = Readonly<Record<string, never>>;

/** Payload específico de cada evento de PTA. */
export interface WorkpaperEventPayloads {
  readonly WORKPAPER_CREATED: EmptyPayload;
  /** Início da preparação ou retomada após devolução (`fromStatus: 'with_issues'`). */
  readonly PREPARATION_STARTED: { readonly fromStatus: WorkpaperStatus };
  readonly SUBMITTED_FOR_REVIEW: { readonly reviewerId: string };
  readonly RESUBMITTED: { readonly reviewerId: string; readonly previousCycleId?: string };
  readonly REVIEW_STARTED: EmptyPayload;
  readonly REVIEW_NOTE_CREATED: {
    readonly reviewNoteId: string;
    readonly description: string;
    readonly severity: ReviewNoteSeverity;
    readonly assignedTo: string;
  };
  readonly REVIEW_NOTE_RESOLVED: { readonly reviewNoteId: string; readonly resolution?: string };
  readonly RETURNED_FOR_CORRECTION: {
    readonly reason: string;
    readonly openReviewNoteIds: readonly string[];
  };
  readonly REVIEW_APPROVED: EmptyPayload;
  readonly WORKPAPER_FINALIZED: EmptyPayload;
  readonly WORKPAPER_REOPENED: { readonly reason: string };
}

export interface BoardCardEventPayloads {
  readonly BOARD_CARD_CREATED: { readonly boardId: string };
  readonly BOARD_CARD_MOVED: {
    readonly boardId: string;
    readonly fromColumn?: BoardColumnId;
    readonly toColumn: BoardColumnId;
  };
  readonly BOARD_CARD_ASSIGNED: { readonly boardId: string; readonly assigneeId: string };
}

interface AuditEventEnvelope<TType extends AuditEventType, TEntity extends EntityType, TPayload> {
  readonly id: string;
  readonly schemaVersion: typeof AUDIT_EVENT_SCHEMA_VERSION;
  /** Ordem de registro no log (monotônica). Desempata eventos com o mesmo occurredAt. */
  readonly sequence: number;
  readonly eventType: TType;
  readonly eventCategory: EventNature;
  readonly entityType: TEntity;
  readonly entityId: string;
  /** Trabalho a que o evento pertence (desnormalizado para recortes e métricas). */
  readonly engagementId: string;
  readonly workpaperId?: string;
  readonly reviewCycleId?: string;
  /** Quem praticou o ato. Obrigatório para eventos formais. */
  readonly actorId?: string;
  /** Quando o fato aconteceu na origem (ISO 8601 em UTC). */
  readonly occurredAt: string;
  /** Quando o SGA registrou o fato; ≥ occurredAt (importações chegam depois). */
  readonly recordedAt: string;
  readonly source: EventSource;
  /** Id do evento na origem externa (ex.: action do Trello), para idempotência. */
  readonly externalEventId?: string;
  /** Agrupa os eventos de uma mesma operação (ex.: aprovação + finalização). */
  readonly correlationId?: string;
  /** Evento que causou este (ex.: WORKPAPER_FINALIZED ← REVIEW_APPROVED). */
  readonly causationId?: string;
  readonly payload: TPayload;
}

export type WorkpaperEvent = {
  [K in WorkpaperEventType]: AuditEventEnvelope<K, 'workpaper', WorkpaperEventPayloads[K]>;
}[WorkpaperEventType];

export type BoardCardEvent = {
  [K in BoardCardEventType]: AuditEventEnvelope<K, 'board_card', BoardCardEventPayloads[K]>;
}[BoardCardEventType];

export type AuditEvent = WorkpaperEvent | BoardCardEvent;

export function eventNature(event: AuditEvent): EventNature {
  return EVENT_NATURE[event.eventType];
}

export function isWorkpaperEvent(event: AuditEvent): event is WorkpaperEvent {
  return event.entityType === 'workpaper';
}
