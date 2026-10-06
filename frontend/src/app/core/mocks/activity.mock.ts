import { Activity, AppNotification } from '../models';

export const ACTIVITIES: readonly Activity[] = [
  {
    id: 'A-09',
    actorId: 'u-ana',
    action: 'atualizou',
    target: 'PTA-REC-001 — Receita',
    link: '/workpapers/PTA-REC-001',
    at: '2026-10-05T17:40:00-03:00',
  },
  {
    id: 'A-08',
    actorId: 'u-matheus',
    action: 'executou Detecção de Duplicidades em',
    target: 'Empresa Alfa S.A.',
    link: '/automations',
    at: '2026-10-05T16:20:00-03:00',
  },
  {
    id: 'A-07',
    actorId: 'u-rafael',
    action: 'iniciou a revisão de',
    target: 'PTA-CR-001 — Contas a Receber',
    link: '/workpapers/PTA-CR-001',
    at: '2026-10-03T15:12:00-03:00',
  },
  {
    id: 'A-06',
    actorId: 'u-beatriz',
    action: 'enviou para revisão',
    target: 'PTA-FOR-001 — Fornecedores',
    link: '/workpapers/PTA-FOR-001',
    at: '2026-10-02T09:44:00-03:00',
  },
  {
    id: 'A-05',
    actorId: 'u-carlos',
    action: 'registrou pendência em',
    target: 'PTA-FOR-301 — Gama S.A.',
    link: '/workpapers/PTA-FOR-301',
    at: '2026-10-01T18:22:00-03:00',
  },
  {
    id: 'A-04',
    actorId: 'u-rafael',
    action: 'finalizou',
    target: 'PTA-CXA-001 — Caixa e Equivalentes',
    link: '/workpapers/PTA-CXA-001',
    at: '2026-09-26T10:30:00-03:00',
  },
];

export const NOTIFICATIONS: readonly AppNotification[] = [
  {
    id: 'N-3',
    text: 'Rafael Lima deixou um ponto de revisão em PTA-REC-001',
    at: '2026-10-06T09:20:00-03:00',
    link: '/workpapers/PTA-REC-001',
    unread: true,
  },
  {
    id: 'N-2',
    text: 'Prazo de PTA-REC-001 vence em 2 dias',
    at: '2026-10-06T08:00:00-03:00',
    link: '/workflow',
    unread: true,
  },
  {
    id: 'N-1',
    text: 'Extração Estruturada de PDF falhou em Gama S.A.',
    at: '2026-10-02T14:41:00-03:00',
    link: '/automations',
    unread: false,
  },
];
