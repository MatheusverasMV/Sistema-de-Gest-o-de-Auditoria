import { buildSampleItems, SAMPLE_POPULATION } from './automations.mock';
import { BOARDS } from './boards.mock';
import { ENGAGEMENTS } from './engagements.mock';
import { TASKS } from './tasks.mock';
import { USERS } from './users.mock';
import { WORKPAPERS } from './workpapers.mock';

describe('Consistência dos dados mockados', () => {
  it('a seleção de amostras reproduz os números da especificação', () => {
    const items = buildSampleItems(337_500);
    const covered = items.reduce((sum, i) => sum + i.amount, 0);
    expect(SAMPLE_POPULATION).toEqual({ count: 12_489, value: 18_245_320 });
    expect(items).toHaveLength(25);
    expect(covered).toBe(8_114_280);
    expect(Math.round((covered / SAMPLE_POPULATION.value) * 1000) / 10).toBe(44.5);
  });

  it('referências entre entidades apontam para registros existentes', () => {
    const userIds = new Set(USERS.map((u) => u.id));
    const engagementIds = new Set(ENGAGEMENTS.map((e) => e.id));
    const workpaperIds = new Set(WORKPAPERS.map((w) => w.id));
    const taskIds = new Set(TASKS.map((t) => t.id));

    for (const w of WORKPAPERS) {
      expect(engagementIds.has(w.engagementId)).toBe(true);
      expect(userIds.has(w.preparerId) && userIds.has(w.reviewerId)).toBe(true);
    }
    for (const card of BOARDS.flatMap((b) => b.columns.flatMap((c) => c.cards))) {
      expect(engagementIds.has(card.engagementId)).toBe(true);
      expect(userIds.has(card.assigneeId)).toBe(true);
      if (card.workpaperId) expect(workpaperIds.has(card.workpaperId)).toBe(true);
      if (card.taskId) expect(taskIds.has(card.taskId)).toBe(true);
    }
  });

  it('PTA-REC-001 inicia no estado esperado pela jornada de demonstração', () => {
    const revenue = WORKPAPERS.find((w) => w.id === 'PTA-REC-001')!;
    expect(revenue.status).toBe('in_preparation');
    expect(revenue.procedures.some((p) => p.automationId === 'sample-selection' && !p.done)).toBe(
      true,
    );
    const card = BOARDS[0].columns
      .find((c) => c.id === 'in_progress')!
      .cards.find((c) => c.workpaperId === 'PTA-REC-001');
    expect(card).toBeDefined();
  });
});
