import { BOARDS } from '../../core/mocks/boards.mock';
import { columnOf, moveCard } from './board-logic';

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
