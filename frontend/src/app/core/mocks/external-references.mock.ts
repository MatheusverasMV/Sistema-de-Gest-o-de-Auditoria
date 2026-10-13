import { ExternalReference } from '../models';

/*
 * Vínculos demonstrativos com o Trello. Os ids externos são FICTÍCIOS (formato de 24
 * caracteres hexadecimais, como os do Trello) e não correspondem a nenhum quadro real:
 * não há conexão com a API. `syncedAt` ausente = vínculo nunca sincronizado.
 *
 * Ilustram os casos previstos: quadro → quadro do SGA, cartão → PTA, cartão → tarefa,
 * membro → usuário e uma entidade interna com duas referências externas legítimas.
 */
export const EXTERNAL_REFERENCES: readonly ExternalReference[] = [
  {
    id: 'XR-001',
    provider: 'trello',
    externalEntityType: 'board',
    externalEntityId: '64f1a0c2e5b7d90012ab3c01',
    internalEntityType: 'board',
    internalEntityId: 'board-alfa-2026',
  },
  {
    id: 'XR-002',
    provider: 'trello',
    externalEntityType: 'card',
    externalEntityId: '64f1a0c2e5b7d90012ab3c11',
    internalEntityType: 'workpaper',
    internalEntityId: 'PTA-REC-001',
  },
  {
    // Cartão de checklist de encerramento no quadro do sócio, também ligado ao PTA de Receita.
    id: 'XR-003',
    provider: 'trello',
    externalEntityType: 'card',
    externalEntityId: '64f1a0c2e5b7d90012ab3c12',
    internalEntityType: 'workpaper',
    internalEntityId: 'PTA-REC-001',
  },
  {
    id: 'XR-004',
    provider: 'trello',
    externalEntityType: 'card',
    externalEntityId: '64f1a0c2e5b7d90012ab3c13',
    internalEntityType: 'task',
    internalEntityId: 'T-105',
  },
  {
    id: 'XR-005',
    provider: 'trello',
    externalEntityType: 'member',
    externalEntityId: '5e8b7d90012ab3c0164f1a0c',
    internalEntityType: 'user',
    internalEntityId: 'u-matheus',
  },
];
