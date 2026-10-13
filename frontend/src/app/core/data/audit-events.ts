import { AuditEvent, eventNature } from '../models';
import { EntityCatalog } from './entity-catalog';

/*
 * Validação básica do contrato AuditEvent (Incremento 01). Não há ingestão nem motor de
 * eventos: estas regras definem o que um adaptador (SGA, Trello, importação) precisará
 * respeitar quando os eventos começarem a ser registrados no Incremento 02.
 */

export type AuditEventIssueCode =
  | 'missing_entity'
  | 'engagement_mismatch'
  | 'invalid_timestamps'
  | 'missing_external_event_id'
  | 'formal_event_from_external_source'
  | 'missing_payload_field';

export interface AuditEventIssue {
  readonly code: AuditEventIssueCode;
  readonly message: string;
}

export function validateAuditEvent(event: AuditEvent, catalog: EntityCatalog): AuditEventIssue[] {
  const issues: AuditEventIssue[] = [];
  const issue = (code: AuditEventIssueCode, message: string) => issues.push({ code, message });

  const entityEngagementId =
    event.entityType === 'workpaper'
      ? catalog.workpapers.get(event.entityId)?.engagementId
      : catalog.cards.get(event.entityId)?.card.engagementId;
  if (!entityEngagementId) {
    issue('missing_entity', `${event.entityType} ${event.entityId} inexistente.`);
  } else if (event.engagementId && event.engagementId !== entityEngagementId) {
    issue(
      'engagement_mismatch',
      `Evento informa ${event.engagementId}; a entidade é de ${entityEngagementId}.`,
    );
  }

  const occurred = Date.parse(event.occurredAt);
  const recorded = Date.parse(event.recordedAt);
  if (Number.isNaN(occurred) || Number.isNaN(recorded) || recorded < occurred) {
    issue('invalid_timestamps', 'Datas inválidas ou registro anterior à ocorrência.');
  }

  if (event.source === 'trello' && !event.externalEventId) {
    issue('missing_external_event_id', 'Eventos do Trello precisam do id da action de origem.');
  }

  // Mover um cartão no Trello não é ato formal de revisão: atos formais nascem no SGA
  // (ou em importação auditável), nunca de uma ferramenta de organização de trabalho.
  if (event.source === 'trello' && eventNature(event) === 'formal') {
    issue('formal_event_from_external_source', `${event.eventType} não pode ter origem no Trello.`);
  }

  if (
    (event.eventType === 'REVIEW_NOTE_CREATED' || event.eventType === 'REVIEW_NOTE_RESOLVED') &&
    !event.payload.reviewNoteId
  ) {
    issue('missing_payload_field', `${event.eventType} exige reviewNoteId.`);
  }
  if (event.eventType === 'BOARD_CARD_MOVED' && !event.payload.toColumn) {
    issue('missing_payload_field', 'BOARD_CARD_MOVED exige toColumn.');
  }
  return issues;
}
