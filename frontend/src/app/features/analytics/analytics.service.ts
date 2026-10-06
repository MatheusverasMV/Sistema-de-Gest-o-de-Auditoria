import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { AnalyticsRepository, EngagementRepository } from '../../core/data/repositories';
import { Engagement, LedgerAnalysis } from '../../core/models';

export interface AnalyticsView {
  readonly engagement: Engagement | undefined;
  readonly analysis: LedgerAnalysis | null;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly analytics = inject(AnalyticsRepository);
  private readonly engagements = inject(EngagementRepository);

  ledgerAnalysis(engagementId: string): Observable<AnalyticsView> {
    return combineLatest([
      this.analytics.ledgerAnalysis(engagementId),
      this.engagements.get(engagementId),
    ]).pipe(map(([analysis, engagement]) => ({ analysis, engagement: engagement ?? undefined })));
  }
}
