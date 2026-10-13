import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { buildEntityCatalog, EntityCatalog, resolveEntity } from '../data/entity-catalog';
import {
  BoardRepository,
  EngagementRepository,
  ReferenceDataRepository,
  TaskRepository,
  UserRepository,
  WorkpaperRepository,
} from '../data/repositories';
import { EntityResolution, EntityType } from '../models';

/**
 * Ponto único para resolver referências entre módulos (Trabalhos, PTAs, Kanban, Qualidade).
 * Monta o catálogo canônico a partir dos repositórios a cada consulta — sem cache próprio,
 * para refletir alterações feitas na sessão (status de PTA, quadros salvos).
 */
@Injectable({ providedIn: 'root' })
export class EntityResolutionService {
  private readonly referenceData = inject(ReferenceDataRepository);
  private readonly engagements = inject(EngagementRepository);
  private readonly workpapers = inject(WorkpaperRepository);
  private readonly tasks = inject(TaskRepository);
  private readonly boards = inject(BoardRepository);
  private readonly users = inject(UserRepository);

  catalog(): Observable<EntityCatalog> {
    return combineLatest([
      this.referenceData.clients(),
      this.referenceData.auditAreas(),
      this.engagements.identities(),
      this.workpapers.list(),
      this.tasks.list(),
      this.boards.list(),
      this.users.list(),
    ]).pipe(
      map(([clients, auditAreas, engagements, workpapers, tasks, boards, users]) =>
        buildEntityCatalog({ clients, auditAreas, engagements, workpapers, tasks, boards, users }),
      ),
    );
  }

  resolve(type: EntityType, id: string | null | undefined): Observable<EntityResolution> {
    return this.catalog().pipe(map((catalog) => resolveEntity(catalog, { type, id })));
  }
}
