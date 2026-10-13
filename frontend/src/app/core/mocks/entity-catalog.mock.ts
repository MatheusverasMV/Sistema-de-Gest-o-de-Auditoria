import { buildEntityCatalog, CatalogSources, EntityCatalog } from '../data/entity-catalog';
import { BOARDS } from './boards.mock';
import { AUDIT_AREAS, CLIENTS } from './clients.mock';
import { ENGAGEMENT_CATALOG } from './engagements.mock';
import { TASKS } from './tasks.mock';
import { USERS } from './users.mock';
import { WORKPAPERS } from './workpapers.mock';

/** Catálogo montado diretamente dos mocks, para testes de integridade e fixtures. */
export function mockEntityCatalog(overrides: Partial<CatalogSources> = {}): EntityCatalog {
  return buildEntityCatalog({
    clients: CLIENTS,
    auditAreas: AUDIT_AREAS,
    engagements: ENGAGEMENT_CATALOG,
    workpapers: WORKPAPERS,
    tasks: TASKS,
    boards: BOARDS,
    users: USERS,
    ...overrides,
  });
}
