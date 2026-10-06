import { defineUser, User } from '../models';

export const USERS: readonly User[] = [
  defineUser({
    id: 'u-carlos',
    name: 'Carlos Martins',
    email: 'carlos.martins@audimec.com.br',
    primaryRole: 'PARTNER',
    isManager: true,
  }),
  defineUser({
    id: 'u-helena',
    name: 'Helena Duarte',
    email: 'helena.duarte@audimec.com.br',
    primaryRole: 'PARTNER',
    isManager: false,
  }),
  defineUser({
    id: 'u-rafael',
    name: 'Rafael Lima',
    email: 'rafael.lima@audimec.com.br',
    primaryRole: 'SENIOR',
    isManager: false,
  }),
  defineUser({
    id: 'u-matheus',
    name: 'Matheus Veras',
    email: 'matheus.veras@audimec.com.br',
    primaryRole: 'MID',
    isManager: false,
  }),
  defineUser({
    id: 'u-ana',
    name: 'Ana Souza',
    email: 'ana.souza@audimec.com.br',
    primaryRole: 'JUNIOR',
    isManager: false,
  }),
  defineUser({
    id: 'u-beatriz',
    name: 'Beatriz Nunes',
    email: 'beatriz.nunes@audimec.com.br',
    primaryRole: 'ASSISTANT',
    isManager: false,
  }),
  defineUser({
    id: 'u-lucas',
    name: 'Lucas Pereira',
    email: 'lucas.pereira@audimec.com.br',
    primaryRole: 'INTERN',
    isManager: false,
  }),
];

/** Personas disponíveis no seletor de demonstração, na ordem exibida. */
export const PERSONA_IDS: readonly string[] = [
  'u-ana',
  'u-matheus',
  'u-rafael',
  'u-helena',
  'u-carlos',
];

export const DEFAULT_PERSONA_ID = 'u-matheus';
