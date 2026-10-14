import { mockEntityCatalog } from '../mocks/entity-catalog.mock';
import {
  AuditEvent,
  EVENT_NATURE,
  WorkpaperEvent,
  WorkpaperEventType,
  WORKPAPER_STATUS_META,
} from '../models';
import { validateAuditEvent } from './audit-events';

const catalog = mockEntityCatalog();

const approved: WorkpaperEvent = {
  id: 'EV-1',
  schemaVersion: 1,
  sequence: 1,
  eventType: 'REVIEW_APPROVED',
  eventCategory: 'formal',
  entityType: 'workpaper',
  entityId: 'PTA-CXA-001',
  engagementId: 'eng-alfa-2026',
  workpaperId: 'PTA-CXA-001',
  reviewCycleId: 'RC-PTA-CXA-001-1',
  occurredAt: '2026-09-26T10:30:00-03:00',
  recordedAt: '2026-09-26T10:30:01-03:00',
  actorId: 'u-rafael',
  source: 'sga',
  payload: {},
};

describe('Contrato AuditEvent', () => {
  it('evento formal registrado no SGA é válido', () => {
    expect(validateAuditEvent(approved, catalog)).toEqual([]);
  });

  it('separa eventos formais de operacionais', () => {
    expect(EVENT_NATURE.REVIEW_APPROVED).toBe('formal');
    expect(EVENT_NATURE.REVIEW_STARTED).toBe('formal');
    expect(EVENT_NATURE.BOARD_CARD_MOVED).toBe('operational');
  });

  it('evento formal com origem no Trello é rejeitado', () => {
    const fromTrello: AuditEvent = { ...approved, source: 'trello', externalEventId: 'abc' };
    expect(validateAuditEvent(fromTrello, catalog).map((i) => i.code)).toEqual([
      'formal_event_from_external_source',
    ]);
  });

  it('valida entidade, trabalho, datas, id externo e campos obrigatórios', () => {
    const codes = (event: AuditEvent) => validateAuditEvent(event, catalog).map((i) => i.code);
    expect(codes({ ...approved, entityId: 'PTA-XYZ-999' })).toEqual(['missing_entity']);
    expect(codes({ ...approved, engagementId: 'eng-gama-2026' })).toEqual(['engagement_mismatch']);
    expect(codes({ ...approved, recordedAt: '2026-09-25T00:00:00-03:00' })).toEqual([
      'invalid_timestamps',
    ]);
    expect(
      codes({
        ...approved,
        eventType: 'REVIEW_NOTE_CREATED',
        // Payload incompleto de propósito (dado externo malformado).
        payload: {},
      } as unknown as WorkpaperEvent),
    ).toEqual(['missing_payload_field']);
    expect(
      codes({
        id: 'EV-2',
        schemaVersion: 1,
        sequence: 2,
        eventType: 'BOARD_CARD_MOVED',
        eventCategory: 'operational',
        entityType: 'board_card',
        entityId: 'C-04',
        engagementId: 'eng-alfa-2026',
        occurredAt: '2026-10-01T09:00:00Z',
        recordedAt: '2026-10-01T09:00:00Z',
        source: 'trello',
        payload: { boardId: 'board-alfa-2026', toColumn: 'in_progress' },
      }),
    ).toEqual(['missing_external_event_id']);
  });

  it('nomes de eventos não colidem com os status atuais do PTA', () => {
    const statuses = new Set(Object.keys(WORKPAPER_STATUS_META).map((s) => s.toUpperCase()));
    const events = Object.keys(EVENT_NATURE) as WorkpaperEventType[];
    expect(events.filter((e) => statuses.has(e))).toEqual([]);
  });
});
