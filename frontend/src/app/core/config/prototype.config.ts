/**
 * Data de referência do protótipo. Mantém prazos, atrasos e "há X horas"
 * coerentes com os dados mockados independentemente de quando a demo for executada.
 */
export const PROTOTYPE_NOW = new Date('2026-10-06T15:00:00-03:00');

const sessionStart = Date.now();

/** "Agora" no relógio do protótipo: data de referência + tempo decorrido na sessão. */
export function prototypeNow(): Date {
  return new Date(PROTOTYPE_NOW.getTime() + (Date.now() - sessionStart));
}

/** Latência simulada dos repositórios mock, para exercitar estados de carregamento. */
export const MOCK_LATENCY_MS = 280;

export const STORAGE_KEYS = {
  persona: 'sga.persona',
  board: (boardId: string) => `sga.board.${boardId}.v1`,
} as const;
