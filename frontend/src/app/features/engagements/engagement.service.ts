import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { EngagementRepository, WorkpaperRepository } from '../../core/data/repositories';
import { Engagement, Workpaper } from '../../core/models';

export interface EngagementDetail {
  readonly engagement: Engagement;
  readonly workpapers: readonly Workpaper[];
}

@Injectable({ providedIn: 'root' })
export class EngagementService {
  private readonly engagements = inject(EngagementRepository);
  private readonly workpapers = inject(WorkpaperRepository);

  list(): Observable<Engagement[]> {
    return this.engagements.list();
  }

  detail(id: string): Observable<EngagementDetail | null> {
    return combineLatest([this.engagements.get(id), this.workpapers.list()]).pipe(
      map(([engagement, workpapers]) =>
        engagement
          ? { engagement, workpapers: workpapers.filter((w) => w.engagementId === id) }
          : null,
      ),
    );
  }
}
