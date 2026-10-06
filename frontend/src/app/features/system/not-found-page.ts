import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, Card, EmptyState } from '../../shared/ui';

@Component({
  selector: 'sga-not-found-page',
  imports: [Card, EmptyState, Button, RouterLink],
  template: `
    <sga-card>
      <sga-empty-state
        heading="Página não encontrada"
        description="O endereço acessado não existe ou foi movido."
        icon="file-text"
      >
        <a sgaButton variant="primary" icon="layout-dashboard" routerLink="/dashboard"
          >Ir para o Dashboard</a
        >
      </sga-empty-state>
    </sga-card>
  `,
})
export default class NotFoundPage {}
