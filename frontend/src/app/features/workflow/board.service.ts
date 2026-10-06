import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { BoardRepository, EngagementRepository } from '../../core/data/repositories';
import { Board, Engagement } from '../../core/models';

export interface BoardSummary {
  readonly board: Board;
  readonly engagement: Engagement | undefined;
}

@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly boards = inject(BoardRepository);
  private readonly engagements = inject(EngagementRepository);

  list(): Observable<BoardSummary[]> {
    return combineLatest([this.boards.list(), this.engagements.list()]).pipe(
      map(([boards, engagements]) =>
        boards.map((board) => ({
          board,
          engagement: engagements.find((e) => e.id === board.engagementId),
        })),
      ),
    );
  }

  save(board: Board): Observable<Board> {
    return this.boards.save(board);
  }

  reset(boardId: string): Observable<Board> {
    return this.boards.reset(boardId);
  }
}
