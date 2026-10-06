import { computed, inject, Injectable, signal } from '@angular/core';
import { STORAGE_KEYS } from '../config/prototype.config';
import { DEFAULT_PERSONA_ID, PERSONA_IDS } from '../mocks/users.mock';
import { User } from '../models';
import { PeopleService } from '../services/people.service';

/** Sessão simulada: não há autenticação, apenas uma persona ativa escolhida na demo. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly people = inject(PeopleService);
  private readonly personaId = signal(this.restorePersona());

  readonly currentUser = computed<User | null>(() => this.people.byId(this.personaId()) ?? null);

  readonly personas = computed(() =>
    PERSONA_IDS.map((id) => this.people.byId(id)).filter((u): u is User => !!u),
  );

  switchPersona(userId: string): void {
    if (!PERSONA_IDS.includes(userId)) {
      return;
    }
    this.personaId.set(userId);
    try {
      localStorage.setItem(STORAGE_KEYS.persona, userId);
    } catch {
      // Sem armazenamento: a persona vale apenas para esta aba.
    }
  }

  private restorePersona(): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.persona);
      return stored && PERSONA_IDS.includes(stored) ? stored : DEFAULT_PERSONA_ID;
    } catch {
      return DEFAULT_PERSONA_ID;
    }
  }
}
