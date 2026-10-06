import { AccessPolicy, AccessRule } from '../../core/auth/access-policy';

export interface NavItem {
  readonly label: string;
  readonly icon: string;
  readonly link: string;
  /** Regra opcional de visibilidade; itens sem regra são visíveis a todos. */
  readonly requires?: AccessRule;
}

export interface NavSection {
  readonly title: string;
  readonly items: readonly NavItem[];
}

export const NAVIGATION: readonly NavSection[] = [
  {
    title: 'Visão geral',
    items: [{ label: 'Dashboard', icon: 'layout-dashboard', link: '/dashboard' }],
  },
  {
    title: 'Auditoria',
    items: [
      { label: 'Trabalhos', icon: 'briefcase', link: '/engagements' },
      { label: 'Papéis de Trabalho', icon: 'file-text', link: '/workpapers' },
      { label: 'Minhas Tarefas', icon: 'list-todo', link: '/tasks' },
    ],
  },
  {
    title: 'Fluxo de trabalho',
    items: [{ label: 'Quadro', icon: 'square-kanban', link: '/workflow' }],
  },
  {
    title: 'Ferramentas',
    items: [
      { label: 'Automações', icon: 'zap', link: '/automations' },
      { label: 'Análise de Dados', icon: 'chart-column', link: '/analytics' },
    ],
  },
  {
    title: 'Gestão',
    items: [
      {
        label: 'Qualidade & Processos',
        icon: 'gauge',
        link: '/quality',
        requires: AccessPolicy.canAccessQuality,
      },
      { label: 'Relatórios', icon: 'file-chart', link: '/reports' },
    ],
  },
  { title: 'Recursos', items: [{ label: 'Documentos', icon: 'folder-open', link: '/documents' }] },
  { title: 'Sistema', items: [{ label: 'Configurações', icon: 'settings', link: '/settings' }] },
];
