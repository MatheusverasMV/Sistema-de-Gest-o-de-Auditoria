import { AccessPolicy } from '../auth/access-policy';
import { USERS } from '../mocks/users.mock';
import { defineUser, InvalidUserError, roleLabel, User } from './user.model';

const base: User = {
  id: 'u-x',
  name: 'Fulano de Tal',
  email: 'x@x.com',
  primaryRole: 'PARTNER',
  isManager: false,
};

describe('Modelo de usuário', () => {
  it('aceita Sócio com e sem atribuição de Gerente', () => {
    expect(roleLabel(defineUser(base))).toBe('Sócio');
    expect(roleLabel(defineUser({ ...base, isManager: true }))).toBe('Sócio • Gerente');
  });

  it('rejeita Gerente sem cargo de Sócio', () => {
    expect(() => defineUser({ ...base, primaryRole: 'SENIOR', isManager: true })).toThrow(
      InvalidUserError,
    );
  });

  it('todos os usuários mockados respeitam a regra de Gerente', () => {
    expect(USERS.every((u) => !u.isManager || u.primaryRole === 'PARTNER')).toBe(true);
  });
});

describe('AccessPolicy.canAccessQuality', () => {
  it('libera somente cargo principal Sócio', () => {
    expect(AccessPolicy.canAccessQuality({ ...base, isManager: true })).toBe(true);
    expect(AccessPolicy.canAccessQuality(base)).toBe(true);
    for (const role of ['INTERN', 'ASSISTANT', 'JUNIOR', 'MID', 'SENIOR'] as const) {
      expect(AccessPolicy.canAccessQuality({ ...base, primaryRole: role })).toBe(false);
    }
    expect(AccessPolicy.canAccessQuality(null)).toBe(false);
  });
});
