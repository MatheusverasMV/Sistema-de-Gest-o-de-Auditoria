import { Priority, StatusMeta } from './status.model';

export type BoardCardType = 'task' | 'workpaper' | 'review' | 'procedure' | 'issue';

export const CARD_TYPE_LABELS: Record<BoardCardType, string> = {
  task: 'Tarefa',
  workpaper: 'PTA',
  review: 'Revisão',
  procedure: 'Procedimento',
  issue: 'Pendência',
};

export type BoardColumnId = 'backlog' | 'planned' | 'in_progress' | 'in_review' | 'issues' | 'done';

export const COLUMN_STATUS_META: Record<BoardColumnId, StatusMeta> = {
  backlog: { label: 'Backlog', tone: 'neutral' },
  planned: { label: 'Planejado', tone: 'info' },
  in_progress: { label: 'Em execução', tone: 'brand' },
  in_review: { label: 'Em revisão', tone: 'warning' },
  issues: { label: 'Pendência', tone: 'danger' },
  done: { label: 'Concluído', tone: 'success' },
};

export interface BoardCard {
  readonly id: string;
  readonly code?: string;
  readonly title: string;
  readonly type: BoardCardType;
  readonly assigneeId: string;
  readonly priority: Priority;
  readonly dueDate: string;
  readonly tags: readonly string[];
  readonly engagementId: string;
  readonly workpaperId?: string;
  readonly taskId?: string;
}

export interface BoardColumn {
  readonly id: BoardColumnId;
  readonly title: string;
  readonly cards: readonly BoardCard[];
}

export interface Board {
  readonly id: string;
  readonly engagementId: string;
  readonly title: string;
  readonly columns: readonly BoardColumn[];
}
