import { inject, Injectable } from '@angular/core';
import { catchError, combineLatest, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import {
  BoardRepository,
  EngagementRepository,
  WorkflowRepository,
} from '../../core/data/repositories';
import { formalProjections } from '../../core/data/workflow-projection';
import { Board, Engagement, WorkpaperStatus } from '../../core/models';
import { EntityResolutionService } from '../../core/services/entity-resolution.service';
import { applyWorkflowProjection } from './board-logic';

export interface BoardSummary {
  readonly board: Board;
  readonly engagement: Engagement | undefined;
  /**
   * PTAs que existem no catálogo canônico. Quadros salvos no navegador podem guardar
   * vínculos antigos; só estes recebem o link "Abrir PTA".
   */
  readonly linkedWorkpaperIds: ReadonlySet<string>;
  /** Status formal de cada PTA (do histórico de eventos), para distinguir da posição do cartão. */
  readonly workpaperStatuses: ReadonlyMap<string, WorkpaperStatus>;
}

@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly boards = inject(BoardRepository);
  private readonly engagements = inject(EngagementRepository);
  private readonly entities = inject(EntityResolutionService);
  private readonly workflow = inject(WorkflowRepository);

  /**
   * Quadros com a projeção PTA → Kanban aplicada. Cartões movidos pela projeção são
   * gravados (marcando o evento já refletido); a projeção nunca grava eventos.
   * Histórico ilegível não impede o Kanban de funcionar: só a projeção é suspensa.
   */
  list(): Observable<BoardSummary[]> {
    const projections = this.workflow.load().pipe(
      map(formalProjections),
      catchError(() => of(new Map())),
    );
    return combineLatest([
      this.boards.list(),
      this.engagements.list(),
      this.entities.catalog(),
      projections,
    ]).pipe(
      switchMap(([boards, engagements, catalog, formal]) => {
        const projected = boards.map((board) => applyWorkflowProjection(board, formal));
        const saves = projected.map((board, i) =>
          board === boards[i] ? of(board) : this.boards.save(board),
        );
        const linkedWorkpaperIds = new Set(catalog.workpapers.keys());
        const workpaperStatuses = new Map(
          [...catalog.workpapers.values()].map((w) => [w.id, w.status] as const),
        );
        return (saves.length ? forkJoin(saves) : of([])).pipe(
          map((saved) =>
            saved.map((board) => ({
              board,
              engagement: engagements.find((e) => e.id === board.engagementId),
              linkedWorkpaperIds,
              workpaperStatuses,
            })),
          ),
        );
      }),
    );
  }

  save(board: Board): Observable<Board> {
    return this.boards.save(board);
  }

  reset(boardId: string): Observable<Board> {
    return this.boards.reset(boardId);
  }
}
