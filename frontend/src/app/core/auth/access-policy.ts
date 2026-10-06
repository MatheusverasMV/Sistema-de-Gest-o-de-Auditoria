import { User } from '../models';

/**
 * Regras de acesso simuladas no frontend. Não substituem autorização no backend:
 * servem apenas para demonstrar a experiência por perfil no protótipo.
 */
export const AccessPolicy = {
  /** Qualidade & Processos: exclusivo para cargo principal Sócio (com ou sem atribuição de Gerente). */
  canAccessQuality: (user: User | null): boolean => user?.primaryRole === 'PARTNER',
} as const;

export type AccessRule = (user: User | null) => boolean;
