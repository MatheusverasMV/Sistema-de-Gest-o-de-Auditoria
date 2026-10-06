import { Routes } from '@angular/router';
import { accessGuard } from './core/auth/access.guard';
import { AccessPolicy } from './core/auth/access-policy';
import { AppShell } from './layout/app-shell/app-shell';

export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · SGA',
        loadComponent: () => import('./features/dashboard/dashboard-page'),
      },
      {
        path: 'engagements',
        loadChildren: () => import('./features/engagements/engagements.routes'),
      },
      {
        path: 'workpapers',
        loadChildren: () => import('./features/workpapers/workpapers.routes'),
      },
      {
        path: 'tasks',
        title: 'Minhas Tarefas · SGA',
        loadComponent: () => import('./features/tasks/my-tasks-page'),
      },
      {
        path: 'workflow',
        title: 'Fluxo de Trabalho · SGA',
        loadComponent: () => import('./features/workflow/board-page'),
      },
      {
        path: 'automations',
        loadChildren: () => import('./features/automations/automations.routes'),
      },
      {
        path: 'analytics',
        title: 'Análise de Dados · SGA',
        loadComponent: () => import('./features/analytics/analytics-page'),
      },
      {
        path: 'quality',
        title: 'Qualidade & Processos · SGA',
        canActivate: [accessGuard(AccessPolicy.canAccessQuality)],
        runGuardsAndResolvers: 'always',
        loadComponent: () => import('./features/quality/quality-page'),
      },
      {
        path: 'reports',
        title: 'Relatórios · SGA',
        loadComponent: () => import('./features/reports/reports-page'),
      },
      {
        path: 'documents',
        title: 'Documentos · SGA',
        loadComponent: () => import('./features/documents/documents-page'),
      },
      {
        path: 'settings',
        title: 'Configurações · SGA',
        loadComponent: () => import('./features/settings/settings-page'),
      },
      {
        path: 'unauthorized',
        title: 'Acesso não autorizado · SGA',
        loadComponent: () => import('./features/system/unauthorized-page'),
      },
      {
        path: '**',
        title: 'Página não encontrada · SGA',
        loadComponent: () => import('./features/system/not-found-page'),
      },
    ],
  },
];
