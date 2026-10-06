import { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Central de Automações · SGA',
    loadComponent: () => import('./automation-catalog-page'),
  },
  {
    path: ':id',
    title: 'Executar automação · SGA',
    loadComponent: () => import('./automation-run-page'),
  },
] satisfies Routes;
