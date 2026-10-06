import { Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccessPolicy } from '../../core/auth/access-policy';
import { SessionService } from '../../core/auth/session.service';
import { roleLabel } from '../../core/models';
import { Button, Card, EmptyState } from '../../shared/ui';

@Component({
  selector: 'sga-unauthorized-page',
  imports: [Card, EmptyState, Button, RouterLink],
  template: `
    <sga-card>
      <sga-empty-state heading="Acesso não autorizado" [description]="description()" icon="lock">
        <a sgaButton variant="primary" icon="layout-dashboard" routerLink="/dashboard"
          >Voltar ao Dashboard</a
        >
      </sga-empty-state>
    </sga-card>
  `,
})
export default class UnauthorizedPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  /** URL de origem, recebida via query param pelo guard. */
  readonly from = input<string>();

  private readonly fromQuality = computed(() => this.from()?.startsWith('/quality') ?? false);

  protected readonly description = computed(() => {
    const user = this.session.currentUser();
    const area = this.fromQuality() ? 'O módulo Qualidade & Processos' : 'Esta área';
    const role = user ? ` Seu cargo atual é ${roleLabel(user)}.` : '';
    return `${area} é restrito a usuários com cargo de Sócio.${role}`;
  });

  constructor() {
    // Se a persona for trocada para um Sócio nesta tela, retoma a navegação original.
    effect(() => {
      if (this.fromQuality() && AccessPolicy.canAccessQuality(this.session.currentUser())) {
        this.router.navigateByUrl(this.from()!);
      }
    });
  }
}
