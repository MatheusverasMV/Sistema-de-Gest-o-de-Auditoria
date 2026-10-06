import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AccessRule } from './access-policy';
import { SessionService } from './session.service';

/** Bloqueia a rota quando a persona ativa não atende à regra, redirecionando para "acesso não autorizado". */
export function accessGuard(rule: AccessRule): CanActivateFn {
  return (_route, state) => {
    const user = inject(SessionService).currentUser();
    return (
      rule(user) ||
      inject(Router).createUrlTree(['/unauthorized'], { queryParams: { from: state.url } })
    );
  };
}
