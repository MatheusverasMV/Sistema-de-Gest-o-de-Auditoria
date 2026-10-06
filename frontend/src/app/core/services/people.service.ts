import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UserRepository } from '../data/repositories';
import { User } from '../models';

/**
 * Diretório de pessoas carregado na inicialização. Usuários são dados de referência
 * consultados em quase todas as telas, por isso ficam disponíveis de forma síncrona.
 */
@Injectable({ providedIn: 'root' })
export class PeopleService {
  private readonly repository = inject(UserRepository);
  private readonly users = signal<readonly User[]>([]);
  private readonly index = computed(() => new Map(this.users().map((u) => [u.id, u])));

  readonly all = this.users.asReadonly();

  async load(): Promise<void> {
    this.users.set(await firstValueFrom(this.repository.list()));
  }

  byId(id: string): User | undefined {
    return this.index().get(id);
  }

  nameOf(id: string): string {
    return this.byId(id)?.name ?? 'Usuário removido';
  }
}
