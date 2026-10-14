import { mockEntityCatalog } from '../mocks/entity-catalog.mock';
import { EXTERNAL_REFERENCES } from '../mocks/external-references.mock';
import { BoardCardEvent, ExternalReference } from '../models';
import {
  externalKey,
  ExternalReferenceConflictError,
  indexExternalReferences,
  referencesOf,
  resolveExternalReference,
  validateExternalReferences,
} from './external-references';
import { validateAuditEvent } from './audit-events';

const catalog = mockEntityCatalog();

const card = (externalEntityId: string) => ({
  provider: 'trello' as const,
  externalEntityType: 'card' as const,
  externalEntityId,
});

const ref = (overrides: Partial<ExternalReference>): ExternalReference => ({
  id: 'XR-T',
  provider: 'trello',
  externalEntityType: 'card',
  externalEntityId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  internalEntityType: 'workpaper',
  internalEntityId: 'PTA-REC-001',
  ...overrides,
});

describe('Referências externas (Trello)', () => {
  it('os vínculos demonstrativos são íntegros', () => {
    expect(validateExternalReferences(EXTERNAL_REFERENCES, catalog)).toEqual([]);
  });

  it('referência Trello válida → entidade interna correta', () => {
    const result = resolveExternalReference(
      EXTERNAL_REFERENCES,
      catalog,
      card('64f1a0c2e5b7d90012ab3c11'),
    );
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.entity).toMatchObject({
        entityType: 'workpaper',
        entityId: 'PTA-REC-001',
        link: { commands: ['/workpapers', 'PTA-REC-001'] },
      });
    }
    // O mesmo tipo externo (card) pode representar uma tarefa: o vínculo é explícito.
    const task = resolveExternalReference(
      EXTERNAL_REFERENCES,
      catalog,
      card('64f1a0c2e5b7d90012ab3c13'),
    );
    expect(task.status === 'resolved' && task.entity.entityType).toBe('task');
  });

  it('referência Trello desconhecida → não resolvida', () => {
    expect(
      resolveExternalReference(EXTERNAL_REFERENCES, catalog, card('ffffffffffffffffffffffff')),
    ).toEqual({
      status: 'unknown',
      key: 'trello|card|ffffffffffffffffffffffff',
    });
  });

  it('id externo duplicado com vínculos conflitantes → erro explícito', () => {
    const conflicting = [
      ref({ id: 'XR-A' }),
      ref({ id: 'XR-B', internalEntityType: 'task', internalEntityId: 'T-105' }),
    ];
    expect(() => indexExternalReferences(conflicting)).toThrow(ExternalReferenceConflictError);
    expect(() =>
      resolveExternalReference(conflicting, catalog, card('aaaaaaaaaaaaaaaaaaaaaaaa')),
    ).toThrow(/entidades internas diferentes/);
    expect(validateExternalReferences(conflicting, catalog)).toContainEqual(
      expect.objectContaining({ code: 'conflicting_duplicate', referenceIds: ['XR-A', 'XR-B'] }),
    );
  });

  it('duplicata idêntica não é conflito, mas é sinalizada', () => {
    const redundant = [ref({ id: 'XR-A' }), ref({ id: 'XR-B' })];
    expect(indexExternalReferences(redundant).size).toBe(1);
    expect(validateExternalReferences(redundant, catalog).map((i) => i.code)).toEqual([
      'redundant_duplicate',
    ]);
  });

  it('entidade interna inexistente → vínculo inválido', () => {
    const missing = [ref({ internalEntityId: 'PTA-REC-999' })];
    expect(
      resolveExternalReference(missing, catalog, card('aaaaaaaaaaaaaaaaaaaaaaaa')),
    ).toMatchObject({
      status: 'invalid',
      reason: 'missing_internal',
    });
    expect(validateExternalReferences(missing, catalog).map((i) => i.code)).toEqual([
      'missing_internal',
    ]);
  });

  it('tipo externo incompatível com o tipo interno → vínculo inválido', () => {
    const wrong = [ref({ externalEntityType: 'member', internalEntityType: 'workpaper' })];
    expect(validateExternalReferences(wrong, catalog).map((i) => i.code)).toEqual([
      'incompatible_type',
    ]);
  });

  it('entidade interna com múltiplas referências externas válidas → resolução consistente', () => {
    const refs = referencesOf(EXTERNAL_REFERENCES, { type: 'workpaper', id: 'PTA-REC-001' });
    expect(refs.map((r) => r.id)).toEqual(['XR-002', 'XR-003']);
    const targets = refs.map((r) => {
      const result = resolveExternalReference(EXTERNAL_REFERENCES, catalog, r);
      return result.status === 'resolved' ? result.entity.entityId : null;
    });
    expect(targets).toEqual(['PTA-REC-001', 'PTA-REC-001']);
  });

  it('a chave de unicidade combina provedor, tipo e id externo', () => {
    expect(externalKey(card('abc'))).toBe('trello|card|abc');
    const sameIdOtherType = [
      ref({ id: 'XR-A', externalEntityId: 'abc' }),
      ref({
        id: 'XR-B',
        externalEntityId: 'abc',
        externalEntityType: 'member',
        internalEntityType: 'user',
        internalEntityId: 'u-ana',
      }),
    ];
    expect(indexExternalReferences(sameIdOtherType).size).toBe(2);
  });

  it('o SGA funciona sem nenhuma referência externa', () => {
    expect(validateExternalReferences([], catalog)).toEqual([]);
    expect(resolveExternalReference([], catalog, card('64f1a0c2e5b7d90012ab3c11')).status).toBe(
      'unknown',
    );
  });
});

describe('Payload fictício do Trello → evento operacional normalizado', () => {
  // Formato reduzido de uma action "updateCard" do Trello (dados fictícios, sem rede).
  const trelloAction = {
    id: '6510aa00bb11cc22dd33ee44',
    type: 'updateCard',
    date: '2026-10-05T14:12:00.000Z',
    data: {
      card: { id: '64f1a0c2e5b7d90012ab3c11' },
      listBefore: { name: 'Em execução' },
      listAfter: { name: 'Em revisão' },
    },
  };

  /** Esboço do que um adaptador fará: só referências + eventos OPERACIONAIS. */
  function toBoardCardMoved(): BoardCardEvent | null {
    // O cartão do Trello está vinculado a um PTA; o cartão do quadro do SGA que
    // representa esse PTA é encontrado pelo id canônico, nunca pelo título.
    const result = resolveExternalReference(
      EXTERNAL_REFERENCES,
      catalog,
      card(trelloAction.data.card.id),
    );
    if (result.status !== 'resolved') return null;
    const location = [...catalog.cards.values()].find(
      (l) => l.card.workpaperId === result.entity.entityId,
    );
    if (!location) return null;
    return {
      id: 'EV-T-1',
      schemaVersion: 1,
      sequence: 1,
      eventType: 'BOARD_CARD_MOVED',
      eventCategory: 'operational',
      entityType: 'board_card',
      entityId: location.card.id,
      engagementId: location.card.engagementId,
      workpaperId: location.card.workpaperId,
      occurredAt: trelloAction.date,
      recordedAt: '2026-10-05T14:12:05.000Z',
      source: 'trello',
      externalEventId: trelloAction.id,
      payload: { boardId: location.boardId, fromColumn: 'in_progress', toColumn: 'in_review' },
    };
  }

  it('mover para "Em revisão" gera BOARD_CARD_MOVED, não um evento formal de revisão', () => {
    const event = toBoardCardMoved()!;
    expect(event.eventType).toBe('BOARD_CARD_MOVED');
    expect(validateAuditEvent(event, catalog)).toEqual([]);
  });
});
