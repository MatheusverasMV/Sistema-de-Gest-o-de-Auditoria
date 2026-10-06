import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable, switchMap, throwError } from 'rxjs';
import { prototypeNow } from '../../core/config/prototype.config';
import {
  ActivityRepository,
  EngagementRepository,
  WorkpaperRepository,
} from '../../core/data/repositories';
import { canSubmitForReview, Engagement, Workpaper } from '../../core/models';

export interface WorkpaperWithEngagement {
  readonly workpaper: Workpaper;
  readonly engagement: Engagement | undefined;
}

@Injectable({ providedIn: 'root' })
export class WorkpaperService {
  private readonly workpapers = inject(WorkpaperRepository);
  private readonly engagements = inject(EngagementRepository);
  private readonly activity = inject(ActivityRepository);

  list(): Observable<WorkpaperWithEngagement[]> {
    return combineLatest([this.workpapers.list(), this.engagements.list()]).pipe(
      map(([workpapers, engagements]) =>
        workpapers.map((workpaper) => ({
          workpaper,
          engagement: engagements.find((e) => e.id === workpaper.engagementId),
        })),
      ),
    );
  }

  get(id: string): Observable<WorkpaperWithEngagement | null> {
    return combineLatest([this.workpapers.get(id), this.engagements.list()]).pipe(
      map(([workpaper, engagements]) =>
        workpaper
          ? { workpaper, engagement: engagements.find((e) => e.id === workpaper.engagementId) }
          : null,
      ),
    );
  }

  submitForReview(workpaper: Workpaper, actorId: string): Observable<Workpaper> {
    if (!canSubmitForReview(workpaper.status)) {
      return throwError(
        () => new Error(`PTA ${workpaper.id} não pode ser enviado para revisão no status atual.`),
      );
    }
    return this.workpapers.updateStatus(workpaper.id, 'awaiting_review').pipe(
      switchMap((updated) =>
        this.activity
          .add({
            actorId,
            action: 'enviou para revisão',
            target: `${updated.id} — ${updated.area}`,
            link: `/workpapers/${updated.id}`,
            at: prototypeNow().toISOString(),
          })
          .pipe(map(() => updated)),
      ),
    );
  }
}
