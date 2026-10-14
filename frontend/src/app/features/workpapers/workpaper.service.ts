import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { EngagementRepository, WorkpaperRepository } from '../../core/data/repositories';
import { Engagement, Workpaper } from '../../core/models';

export interface WorkpaperWithEngagement {
  readonly workpaper: Workpaper;
  readonly engagement: Engagement | undefined;
}

/** Consulta de PTAs. Atos formais (envio, revisão, aprovação) ficam no WorkpaperWorkflowService. */
@Injectable({ providedIn: 'root' })
export class WorkpaperService {
  private readonly workpapers = inject(WorkpaperRepository);
  private readonly engagements = inject(EngagementRepository);

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
}
