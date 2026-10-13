import { BOARDS } from '../mocks/boards.mock';
import { AUDIT_AREAS, CLIENTS } from '../mocks/clients.mock';
import { mockEntityCatalog } from '../mocks/entity-catalog.mock';
import { ENGAGEMENT_CATALOG, ENGAGEMENTS, HISTORICAL_ENGAGEMENTS } from '../mocks/engagements.mock';
import { QUALITY_DATASET } from '../mocks/quality.mock';
import { TASKS } from '../mocks/tasks.mock';
import { WORKPAPERS } from '../mocks/workpapers.mock';
import { Board, ObservationContext } from '../models';
import { boardOfEngagement, checkReferentialIntegrity, resolveEntity } from './entity-catalog';

const catalog = mockEntityCatalog();

describe('Integridade referencial dos mocks', () => {
  it('o catálogo compartilhado não tem inconsistências', () => {
    expect(checkReferentialIntegrity(catalog)).toEqual([]);
  });

  it('todo PTA aponta para um trabalho operacional existente', () => {
    for (const w of WORKPAPERS) {
      expect(catalog.engagements.get(w.engagementId)?.recordKind).toBe('operational');
    }
  });

  it('todo trabalho aponta para um cliente existente, com o mesmo nome exibido', () => {
    for (const e of ENGAGEMENTS) {
      expect(catalog.clients.get(e.clientId)?.name).toBe(e.client);
    }
    for (const e of HISTORICAL_ENGAGEMENTS) {
      expect(catalog.clients.has(e.clientId)).toBe(true);
    }
  });

  it('cartões do Kanban usam o trabalho do quadro e resolvem PTA e tarefa', () => {
    for (const board of BOARDS) {
      for (const card of board.columns.flatMap((c) => c.cards)) {
        expect(card.engagementId).toBe(board.engagementId);
        if (card.workpaperId) {
          expect(resolveEntity(catalog, { type: 'workpaper', id: card.workpaperId }).status).toBe(
            'resolved',
          );
        }
        if (card.taskId) {
          expect(catalog.tasks.get(card.taskId)?.engagementId).toBe(card.engagementId);
        }
      }
    }
  });

  it('ids de cartão são únicos entre todos os quadros', () => {
    const ids = BOARDS.flatMap((b) => b.columns.flatMap((c) => c.cards.map((card) => card.id)));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('áreas de PTAs e de observações de Qualidade pertencem ao catálogo de áreas', () => {
    const names = new Set(AUDIT_AREAS.map((a) => a.name));
    for (const w of WORKPAPERS) expect(names.has(w.area)).toBe(true);
    for (const c of qualityContexts()) {
      if (c.auditArea) expect(names.has(c.auditArea)).toBe(true);
    }
  });

  it('cartão com PTA inexistente é marcado como referência inválida', () => {
    const [board] = BOARDS;
    const broken: Board = {
      ...board,
      columns: board.columns.map((c, i) =>
        i === 0 ? { ...c, cards: [{ ...c.cards[0], workpaperId: 'PTA-XYZ-999' }] } : c,
      ),
    };
    const issues = checkReferentialIntegrity(mockEntityCatalog({ boards: [broken] }));
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'missing_workpaper',
        entity: { type: 'board_card', id: 'C-01' },
      }),
    );
  });

  it('cartão de um trabalho apontando para PTA de outro trabalho é inconsistência', () => {
    const [board] = BOARDS;
    const mixed: Board = {
      ...board,
      columns: board.columns.map((c, i) =>
        i === 0 ? { ...c, cards: [{ ...c.cards[0], workpaperId: 'PTA-FOR-301' }] } : c,
      ),
    };
    expect(checkReferentialIntegrity(mockEntityCatalog({ boards: [mixed] }))).toContainEqual(
      expect.objectContaining({ code: 'engagement_mismatch' }),
    );
  });

  it('os mocks são determinísticos', async () => {
    const again = await import('../mocks/quality.mock');
    expect(again.QUALITY_DATASET).toBe(QUALITY_DATASET);
    expect(JSON.stringify(mockEntityCatalog().engagements.get('eng-gama-2025'))).toBe(
      JSON.stringify(catalog.engagements.get('eng-gama-2025')),
    );
  });
});

describe('Trabalhos históricos', () => {
  it('estão no catálogo, mas nunca entre os trabalhos operacionais', () => {
    const operational = new Set(ENGAGEMENTS.map((e) => e.id));
    expect(HISTORICAL_ENGAGEMENTS.map((e) => e.id).sort()).toEqual([
      'eng-alfa-itr-2026',
      'eng-beta-2025',
      'eng-gama-2025',
    ]);
    for (const e of HISTORICAL_ENGAGEMENTS) {
      expect(operational.has(e.id)).toBe(false);
      expect(e.recordKind).toBe('historical');
      expect(e.status).toBeUndefined();
    }
  });

  it('não recebem PTAs, tarefas nem quadros', () => {
    const historical = new Set(HISTORICAL_ENGAGEMENTS.map((e) => e.id));
    expect(WORKPAPERS.some((w) => historical.has(w.engagementId))).toBe(false);
    expect(TASKS.some((t) => historical.has(t.engagementId))).toBe(false);
    expect(BOARDS.some((b) => historical.has(b.engagementId))).toBe(false);
  });

  it('resolvem como históricos, sem navegação', () => {
    expect(resolveEntity(catalog, { type: 'engagement', id: 'eng-beta-2025' })).toMatchObject({
      status: 'resolved',
      recordKind: 'historical',
      link: null,
    });
  });

  it('há apenas um trabalho por id no catálogo', () => {
    const ids = ENGAGEMENT_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Qualidade usa as referências canônicas', () => {
  it('todo cliente e trabalho das observações existe no catálogo compartilhado', () => {
    for (const c of qualityContexts()) {
      expect(catalog.clients.get(c.clientId!)?.name).toBe(c.clientName);
      expect(catalog.engagements.has(c.engagementId!)).toBe(true);
    }
  });

  it('nenhum id canônico de PTA ou evento é inventado para completar o contexto', () => {
    for (const c of qualityContexts()) {
      expect(c.workpaperId === undefined || catalog.workpapers.has(c.workpaperId)).toBe(true);
      expect(c.eventId).toBeUndefined();
    }
    // Os códigos sintéticos da fonte estatística não colidem com PTAs operacionais.
    const codes = qualityContexts().flatMap((c) => (c.workpaperCode ? [c.workpaperCode] : []));
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.filter((code) => catalog.workpapers.has(code))).toEqual([]);
  });
});

describe('resolveEntity', () => {
  it('constrói links somente para entidades com tela própria', () => {
    expect(resolveEntity(catalog, { type: 'engagement', id: 'eng-alfa-2026' })).toMatchObject({
      status: 'resolved',
      link: { commands: ['/engagements', 'eng-alfa-2026'] },
    });
    expect(resolveEntity(catalog, { type: 'workpaper', id: 'PTA-REC-001' })).toMatchObject({
      status: 'resolved',
      link: { commands: ['/workpapers', 'PTA-REC-001'] },
    });
    expect(resolveEntity(catalog, { type: 'board_card', id: 'C-04' })).toMatchObject({
      link: { commands: ['/workflow'], queryParams: { board: 'board-alfa-2026' } },
    });
    expect(resolveEntity(catalog, { type: 'client', id: 'cli-alfa' })).toMatchObject({
      status: 'resolved',
      link: null,
    });
  });

  it('distingue id inexistente de vínculo ausente e não usa semelhança de texto', () => {
    expect(resolveEntity(catalog, { type: 'workpaper', id: 'PTA-REC-999' })).toEqual({
      status: 'unresolved',
      entityType: 'workpaper',
      entityId: 'PTA-REC-999',
      reason: 'not_found',
    });
    expect(resolveEntity(catalog, { type: 'workpaper' })).toMatchObject({ reason: 'not_linked' });
    expect(resolveEntity(catalog, { type: 'client', id: 'Empresa Alfa S.A.' }).status).toBe(
      'unresolved',
    );
    expect(resolveEntity(catalog, { type: 'workpaper', id: 'pta-rec-001' }).status).toBe(
      'unresolved',
    );
  });

  it('localiza o quadro de um trabalho', () => {
    expect(boardOfEngagement(catalog, 'eng-alfa-2026')?.id).toBe('board-alfa-2026');
    expect(boardOfEngagement(catalog, 'eng-gama-2026')).toBeUndefined();
  });

  it('o catálogo indexa todas as entidades dos mocks', () => {
    expect(catalog.clients.size).toBe(CLIENTS.length);
    expect(catalog.engagements.size).toBe(ENGAGEMENTS.length + HISTORICAL_ENGAGEMENTS.length);
    expect(catalog.workpapers.size).toBe(WORKPAPERS.length);
  });
});

function qualityContexts(): ObservationContext[] {
  const d = QUALITY_DATASET;
  return [
    ...d.reviewCycle,
    ...d.noteResolution,
    ...d.hoursDeviation,
    ...d.rework,
    ...d.reviewNotes,
    ...d.overdueRequests,
  ].map((o) => o.context);
}
