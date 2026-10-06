import { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Papéis de Trabalho · SGA',
    loadComponent: () => import('./workpaper-list-page'),
  },
  {
    path: ':id',
    title: 'PTA · SGA',
    loadComponent: () => import('./workpaper-detail/workpaper-detail-page'),
  },
] satisfies Routes;
