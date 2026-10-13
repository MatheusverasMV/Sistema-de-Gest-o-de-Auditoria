import {
  AuditArea,
  Board,
  BoardCard,
  BoardColumnId,
  Client,
  EngagementIdentity,
  EntityLink,
  EntityRef,
  EntityResolution,
  EntityType,
  Task,
  User,
  Workpaper,
} from '../models';

/*
 * Catálogo canônico de entidades: um índice somente leitura montado a partir dos
 * repositórios (não é uma segunda fonte de dados). Resolve referências por id exato —
 * nunca por semelhança de nome — e verifica a integridade referencial entre módulos.
 */

export interface CatalogSources {
  readonly clients: readonly Client[];
  readonly engagements: readonly EngagementIdentity[];
  readonly auditAreas: readonly AuditArea[];
  readonly workpapers: readonly Workpaper[];
  readonly tasks: readonly Task[];
  readonly boards: readonly Board[];
  readonly users: readonly User[];
}

export interface BoardCardLocation {
  readonly card: BoardCard;
  readonly boardId: string;
  readonly columnId: BoardColumnId;
}

export interface EntityCatalog {
  readonly clients: ReadonlyMap<string, Client>;
  readonly engagements: ReadonlyMap<string, EngagementIdentity>;
  /** Indexado pelo nome, que é como PTAs e observações guardam a área. */
  readonly auditAreas: ReadonlyMap<string, AuditArea>;
  readonly workpapers: ReadonlyMap<string, Workpaper>;
  readonly tasks: ReadonlyMap<string, Task>;
  readonly boards: ReadonlyMap<string, Board>;
  readonly cards: ReadonlyMap<string, BoardCardLocation>;
  readonly users: ReadonlyMap<string, User>;
}

export function buildEntityCatalog(sources: CatalogSources): EntityCatalog {
  const cards = new Map<string, BoardCardLocation>();
  for (const board of sources.boards) {
    for (const column of board.columns) {
      for (const card of column.cards) {
        cards.set(card.id, { card, boardId: board.id, columnId: column.id });
      }
    }
  }
  return {
    clients: byId(sources.clients),
    engagements: byId(sources.engagements),
    auditAreas: new Map(sources.auditAreas.map((a) => [a.name, a])),
    workpapers: byId(sources.workpapers),
    tasks: byId(sources.tasks),
    boards: byId(sources.boards),
    cards,
    users: byId(sources.users),
  };
}

/**
 * Resolve uma referência. `id` ausente ⇒ `not_linked` (a origem não informou vínculo);
 * id desconhecido ⇒ `not_found`. Só entidades operacionais com tela própria recebem link.
 */
export function resolveEntity(
  catalog: EntityCatalog,
  ref: { readonly type: EntityType; readonly id?: string | null },
): EntityResolution {
  const { type, id } = ref;
  if (!id) {
    return { status: 'unresolved', entityType: type, reason: 'not_linked' };
  }
  const notFound: EntityResolution = {
    status: 'unresolved',
    entityType: type,
    entityId: id,
    reason: 'not_found',
  };
  const resolved = (
    label: string,
    link: EntityLink | null,
    recordKind: 'operational' | 'historical' = 'operational',
  ): EntityResolution => ({
    status: 'resolved',
    entityType: type,
    entityId: id,
    label,
    recordKind,
    link,
  });

  switch (type) {
    case 'client': {
      const client = catalog.clients.get(id);
      return client ? resolved(client.name, null) : notFound;
    }
    case 'engagement': {
      const engagement = catalog.engagements.get(id);
      if (!engagement) return notFound;
      return engagement.recordKind === 'operational'
        ? resolved(engagement.title, { commands: ['/engagements', id] })
        : resolved(engagement.title, null, 'historical');
    }
    case 'audit_area': {
      // Áreas são referenciadas pelo nome (ver AuditArea).
      const area = catalog.auditAreas.get(id);
      return area ? resolved(area.name, null) : notFound;
    }
    case 'workpaper': {
      const workpaper = catalog.workpapers.get(id);
      return workpaper
        ? resolved(`${workpaper.id} · ${workpaper.title}`, { commands: ['/workpapers', id] })
        : notFound;
    }
    case 'task': {
      const task = catalog.tasks.get(id);
      return task ? resolved(task.title, null) : notFound;
    }
    case 'board': {
      const board = catalog.boards.get(id);
      return board
        ? resolved(board.title, { commands: ['/workflow'], queryParams: { board: id } })
        : notFound;
    }
    case 'board_card': {
      const location = catalog.cards.get(id);
      return location
        ? resolved(location.card.title, {
            commands: ['/workflow'],
            queryParams: { board: location.boardId },
          })
        : notFound;
    }
    case 'user': {
      const user = catalog.users.get(id);
      return user ? resolved(user.name, null) : notFound;
    }
    case 'document_request':
      // Solicitações documentais ainda não existem como entidade no protótipo.
      return notFound;
  }
}

/** Quadro Kanban do trabalho, quando existir. */
export function boardOfEngagement(catalog: EntityCatalog, engagementId: string): Board | undefined {
  return [...catalog.boards.values()].find((b) => b.engagementId === engagementId);
}

// ---------------------------------------------------------------- integridade

export type IntegrityIssueCode =
  | 'missing_client'
  | 'missing_engagement'
  | 'missing_workpaper'
  | 'missing_task'
  | 'missing_user'
  | 'engagement_mismatch'
  | 'workpaper_mismatch'
  | 'unknown_area'
  | 'historical_engagement_in_use';

export interface IntegrityIssue {
  readonly code: IntegrityIssueCode;
  readonly entity: EntityRef;
  readonly message: string;
}

/**
 * Invariantes entre Trabalhos, PTAs, Tarefas e Kanban. Lista vazia = catálogo íntegro.
 * Trabalhos históricos não podem receber PTAs, tarefas ou quadros (não são operacionais).
 */
export function checkReferentialIntegrity(catalog: EntityCatalog): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const issue = (code: IntegrityIssueCode, entity: EntityRef, message: string) =>
    issues.push({ code, entity, message });

  const checkEngagement = (entity: EntityRef, engagementId: string) => {
    const engagement = catalog.engagements.get(engagementId);
    if (!engagement) {
      issue('missing_engagement', entity, `Trabalho ${engagementId} inexistente.`);
    } else if (engagement.recordKind !== 'operational') {
      issue('historical_engagement_in_use', entity, `Trabalho ${engagementId} é histórico.`);
    }
  };

  for (const engagement of catalog.engagements.values()) {
    if (!catalog.clients.has(engagement.clientId)) {
      issue(
        'missing_client',
        { type: 'engagement', id: engagement.id },
        `Cliente ${engagement.clientId} inexistente.`,
      );
    }
  }

  for (const workpaper of catalog.workpapers.values()) {
    const ref: EntityRef = { type: 'workpaper', id: workpaper.id };
    checkEngagement(ref, workpaper.engagementId);
    if (!catalog.auditAreas.has(workpaper.area)) {
      issue('unknown_area', ref, `Área "${workpaper.area}" fora do catálogo.`);
    }
    for (const userId of [workpaper.preparerId, workpaper.reviewerId]) {
      if (!catalog.users.has(userId)) issue('missing_user', ref, `Usuário ${userId} inexistente.`);
    }
  }

  for (const task of catalog.tasks.values()) {
    const ref: EntityRef = { type: 'task', id: task.id };
    checkEngagement(ref, task.engagementId);
    if (task.workpaperId) {
      const workpaper = catalog.workpapers.get(task.workpaperId);
      if (!workpaper) {
        issue('missing_workpaper', ref, `PTA ${task.workpaperId} inexistente.`);
      } else if (workpaper.engagementId !== task.engagementId) {
        issue('engagement_mismatch', ref, `PTA ${workpaper.id} pertence a outro trabalho.`);
      }
    }
  }

  for (const board of catalog.boards.values()) {
    checkEngagement({ type: 'board', id: board.id }, board.engagementId);
  }

  for (const { card, boardId } of catalog.cards.values()) {
    const ref: EntityRef = { type: 'board_card', id: card.id };
    const board = catalog.boards.get(boardId)!;
    if (card.engagementId !== board.engagementId) {
      issue(
        'engagement_mismatch',
        ref,
        `Cartão aponta para ${card.engagementId}, quadro é de ${board.engagementId}.`,
      );
    }
    if (!catalog.users.has(card.assigneeId)) {
      issue('missing_user', ref, `Responsável ${card.assigneeId} inexistente.`);
    }
    if (card.workpaperId) {
      const workpaper = catalog.workpapers.get(card.workpaperId);
      if (!workpaper) {
        issue('missing_workpaper', ref, `PTA ${card.workpaperId} inexistente.`);
      } else if (workpaper.engagementId !== card.engagementId) {
        issue('engagement_mismatch', ref, `PTA ${workpaper.id} pertence a outro trabalho.`);
      }
    }
    if (card.taskId) {
      const task = catalog.tasks.get(card.taskId);
      if (!task) {
        issue('missing_task', ref, `Tarefa ${card.taskId} inexistente.`);
      } else {
        if (task.engagementId !== card.engagementId) {
          issue('engagement_mismatch', ref, `Tarefa ${task.id} pertence a outro trabalho.`);
        }
        if (card.workpaperId && task.workpaperId && task.workpaperId !== card.workpaperId) {
          issue('workpaper_mismatch', ref, `Tarefa ${task.id} aponta para ${task.workpaperId}.`);
        }
      }
    }
  }
  return issues;
}

function byId<T extends { readonly id: string }>(items: readonly T[]): ReadonlyMap<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}
