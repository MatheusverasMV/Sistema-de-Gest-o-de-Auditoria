import { BOARDS } from '../../core/mocks/boards.mock';
import { FormalProjection } from '../../core/data/workflow-projection';
import {
  applyWorkflowProjection,
  columnForStatus,
  columnOf,
  findCard,
  moveCard,
} from './board-logic';

const board = BOARDS[0];
const ids = (columnId: string, b = board) =>
  b.columns.find((c) => c.id === columnId)!.cards.map((c) => c.id);

describe('moveCard', () => {
  it('move PTA-REC-001 de "Em execução" para "Em revisão" (fim da coluna)', () => {
    const moved = moveCard(board, 'C-05', 'in_review', null);
    expect(columnOf(moved, 'C-05')).toBe('in_review');
    expect(ids('in_review', moved)).toEqual(['C-07', 'C-08', 'C-05']);
    expect(ids('in_progress', moved)).toEqual(['C-06']);
  });

  it('insere antes do cartão indicado', () => {
    const moved = moveCard(board, 'C-05', 'in_review', 'C-08');
    expect(ids('in_review', moved)).toEqual(['C-07', 'C-05', 'C-08']);
  });

  it('reordena dentro da mesma coluna', () => {
    const moved = moveCard(board, 'C-06', 'in_progress', 'C-05');
    expect(ids('in_progress', moved)).toEqual(['C-06', 'C-05']);
  });

  it('não altera o quadro original e preserva o total de cartões', () => {
    const before = JSON.stringify(board);
    const moved = moveCard(board, 'C-01', 'done', null);
    expect(JSON.stringify(board)).toBe(before);
    const count = (b: typeof board) => b.columns.reduce((n, c) => n + c.cards.length, 0);
    expect(count(moved)).toBe(count(board));
  });

  it('ignora cartão inexistente', () => {
    expect(moveCard(board, 'nao-existe', 'done', null)).toBe(board);
  });
});

describe('Projeção PTA → Kanban', () => {
  const projection = (status: FormalProjection['status'], eventId: string) =>
    new Map<string, FormalProjection>([['PTA-REC-001', { status, eventId }]]);

  it('mapeia o status formal para a coluna pelo id, não pelo texto', () => {
    expect(columnForStatus('not_started', 'backlog')).toBe('backlog');
    expect(columnForStatus('not_started', 'done')).toBe('planned');
    expect(columnForStatus('in_preparation')).toBe('in_progress');
    expect(columnForStatus('awaiting_review')).toBe('in_review');
    expect(columnForStatus('in_review')).toBe('in_review');
    expect(columnForStatus('with_issues')).toBe('issues');
    expect(columnForStatus('finalized')).toBe('done');
  });

  it('move só o cartão que representa o PTA e marca o evento refletido', () => {
    const projected = applyWorkflowProjection(board, projection('with_issues', 'EV-000007'));
    expect(columnOf(projected, 'C-05')).toBe('issues');
    expect(findCard(projected, 'C-05')!.projectedEventId).toBe('EV-000007');
    // C-09 é uma pendência do mesmo PTA: não é o PTA e não se move.
    expect(columnOf(projected, 'C-09')).toBe(columnOf(board, 'C-09'));
    expect(findCard(projected, 'C-09')!.projectedEventId).toBeUndefined();
  });

  it('evento já refletido não desfaz a movimentação operacional', () => {
    const projected = applyWorkflowProjection(board, projection('in_review', 'EV-000003'));
    const dragged = moveCard(projected, 'C-05', 'done', null);
    expect(applyWorkflowProjection(dragged, projection('in_review', 'EV-000003'))).toBe(dragged);
    // Um novo evento formal volta a posicionar o cartão.
    expect(
      columnOf(applyWorkflowProjection(dragged, projection('with_issues', 'EV-000009')), 'C-05'),
    ).toBe('issues');
  });

  it('sem projeções o quadro é devolvido intacto', () => {
    expect(applyWorkflowProjection(board, new Map())).toBe(board);
  });
});
