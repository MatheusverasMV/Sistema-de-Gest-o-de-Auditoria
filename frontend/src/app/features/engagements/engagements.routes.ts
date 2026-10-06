import { Routes } from '@angular/router';

export default [
  {
    path: '',
    title: 'Trabalhos · SGA',
    loadComponent: () => import('./engagement-list-page'),
  },
  {
    path: ':id',
    title: 'Trabalho · SGA',
    loadComponent: () => import('./engagement-detail/engagement-detail-page'),
  },
] satisfies Routes;
