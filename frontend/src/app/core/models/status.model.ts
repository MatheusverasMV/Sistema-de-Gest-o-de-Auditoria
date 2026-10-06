/** Tom visual de um status; mapeado para cores semânticas pelo StatusBadge. */
export type StatusTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success' | 'brand';

export interface StatusMeta {
  readonly label: string;
  readonly tone: StatusTone;
}

export type Priority = 'low' | 'medium' | 'high';

export const PRIORITY_META: Record<Priority, StatusMeta> = {
  low: { label: 'Baixa', tone: 'neutral' },
  medium: { label: 'Média', tone: 'warning' },
  high: { label: 'Alta', tone: 'danger' },
};
