import { FormalProjection } from '../../core/data/workflow-projection';
import { Board, BoardCard, BoardColumnId, WorkpaperStatus } from '../../core/models';

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

/**
 * Coluna que representa o status formal de um PTA. "Não iniciado" aceita Backlog ou
 * Planejado (mantém a posição atual se já estiver em uma delas).
 */
export function columnForStatus(status: WorkpaperStatus, current?: BoardColumnId): BoardColumnId {
  switch (status) {
    case 'not_started':
      return current === 'backlog' || current === 'planned' ? current : 'planned';
    case 'in_preparation':
      return 'in_progress';
    case 'awaiting_review':
    case 'in_review':
      return 'in_review';
    case 'with_issues':
      return 'issues';
    case 'finalized':
      return 'done';
  }
}

/** O cartão representa o próprio PTA? (cartões de tarefa, revisão ou pendência não). */
export function representsWorkpaper(card: BoardCard): card is BoardCard & { workpaperId: string } {
  return card.type === 'workpaper' && !!card.workpaperId;
}

/**
 * Projeção PTA → Kanban. Move para a coluna do status formal apenas os cartões que
 * representam um PTA com evento formal ainda não refletido (`projectedEventId`).
 * Depois disso, arrastar o cartão é operacional e não é desfeito. Nunca gera eventos.
 */
export function applyWorkflowProjection(
  board: Board,
  projections: ReadonlyMap<string, FormalProjection>,
): Board {
  let result = board;
  for (const column of board.columns) {
    for (const card of column.cards) {
      if (!representsWorkpaper(card)) continue;
      const projection = projections.get(card.workpaperId);
      if (!projection || projection.eventId === card.projectedEventId) continue;
      const target = columnForStatus(projection.status, column.id);
      const marked = replaceCard(result, { ...card, projectedEventId: projection.eventId });
      result = target === column.id ? marked : moveCard(marked, card.id, target, null);
    }
  }
  return result;
}

function replaceCard(board: Board, card: BoardCard): Board {
  return {
    ...board,
    columns: board.columns.map((column) => ({
      ...column,
      cards: column.cards.map((c) => (c.id === card.id ? card : c)),
    })),
  };
}
