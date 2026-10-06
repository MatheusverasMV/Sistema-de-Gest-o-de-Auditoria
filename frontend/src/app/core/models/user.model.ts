export type PrimaryRole = 'INTERN' | 'ASSISTANT' | 'JUNIOR' | 'MID' | 'SENIOR' | 'PARTNER';

export const ROLE_LABELS: Record<PrimaryRole, string> = {
  INTERN: 'Estagiário',
  ASSISTANT: 'Assistente de Auditoria',
  JUNIOR: 'Auditor Júnior',
  MID: 'Auditor Pleno',
  SENIOR: 'Auditor Sênior',
  PARTNER: 'Sócio',
};

/**
 * Gerente não é um cargo: é uma atribuição acumulável apenas por Sócios.
 * Invariante: `isManager === true` somente quando `primaryRole === 'PARTNER'`.
 */
export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly primaryRole: PrimaryRole;
  readonly isManager: boolean;
}

export class InvalidUserError extends Error {}

export function defineUser(user: User): User {
  if (user.isManager && user.primaryRole !== 'PARTNER') {
    throw new InvalidUserError(
      `Usuário ${user.id}: a atribuição de Gerente é exclusiva de Sócios (cargo atual: ${ROLE_LABELS[user.primaryRole]}).`,
    );
  }
  return user;
}

export function roleLabel(user: Pick<User, 'primaryRole' | 'isManager'>): string {
  const base = ROLE_LABELS[user.primaryRole];
  return user.isManager ? `${base} • Gerente` : base;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
