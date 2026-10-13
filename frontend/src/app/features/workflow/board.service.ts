import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { BoardRepository, EngagementRepository } from '../../core/data/repositories';
import { Board, Engagement } from '../../core/models';
import { EntityResolutionService } from '../../core/services/entity-resolution.service';

export interface BoardSummary {
  readonly board: Board;
  readonly engagement: Engagement | undefined;
  /**
   * PTAs que existem no catálogo canônico. Quadros salvos no navegador podem guardar
   * vínculos antigos; só estes recebem o link "Abrir PTA".
   */
  readonly linkedWorkpaperIds: ReadonlySet<string>;
}

@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly boards = inject(BoardRepository);
  private readonly engagements = inject(EngagementRepository);
  private readonly entities = inject(EntityResolutionService);

  list(): Observable<BoardSummary[]> {
    return combineLatest([
      this.boards.list(),
      this.engagements.list(),
      this.entities.catalog(),
    ]).pipe(
      map(([boards, engagements, catalog]) => {
        const linkedWorkpaperIds = new Set(catalog.workpapers.keys());
        return boards.map((board) => ({
          board,
          engagement: engagements.find((e) => e.id === board.engagementId),
          linkedWorkpaperIds,
        }));
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
