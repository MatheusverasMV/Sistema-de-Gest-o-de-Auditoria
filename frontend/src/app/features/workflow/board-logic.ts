import { Board, BoardCard, BoardColumnId } from '../../core/models';

/**
 * Move um cartão para a coluna de destino, posicionando-o antes de `beforeCardId`
 * (ou no fim da coluna quando nulo). Retorna um novo quadro, sem mutar o original.
 */
export function moveCard(
  board: Board,
  cardId: string,
  toColumnId: BoardColumnId,
  beforeCardId: string | null,
): Board {
  const card = findCard(board, cardId);
  if (!card || cardId === beforeCardId) {
    return board;
  }
  return {
    ...board,
    columns: board.columns.map((column) => {
      const cards = column.cards.filter((c) => c.id !== cardId);
      if (column.id !== toColumnId) {
        return cards.length === column.cards.length ? column : { ...column, cards };
      }
      const index = beforeCardId ? cards.findIndex((c) => c.id === beforeCardId) : -1;
      const position = index === -1 ? cards.length : index;
      return { ...column, cards: [...cards.slice(0, position), card, ...cards.slice(position)] };
    }),
  };
}

export function findCard(board: Board, cardId: string): BoardCard | undefined {
  return board.columns.flatMap((c) => c.cards).find((c) => c.id === cardId);
}

export function columnOf(board: Board, cardId: string): BoardColumnId | undefined {
  return board.columns.find((c) => c.cards.some((card) => card.id === cardId))?.id;
}
