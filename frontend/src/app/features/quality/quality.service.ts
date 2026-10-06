import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import {
  EngagementRepository,
  QualityRepository,
  WorkpaperRepository,
} from '../../core/data/repositories';
import { ControlChartData, QualityMetric } from '../../core/models';
import { individualsChart, proportionChart } from './control-limits';

export interface QualityDashboard {
  readonly metrics: readonly QualityMetric[];
  readonly reviewCycle: ControlChartData;
  readonly rework: ControlChartData;
}

const formatDecimal = (value: number, digits = 1) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

@Injectable({ providedIn: 'root' })
export class QualityService {
  private readonly quality = inject(QualityRepository);
  private readonly engagements = inject(EngagementRepository);
  private readonly workpapers = inject(WorkpaperRepository);

  dashboard(): Observable<QualityDashboard> {
    return combineLatest([
      this.quality.dataset(),
      this.engagements.list(),
      this.workpapers.list(),
    ]).pipe(
      map(([dataset, engagements, workpapers]) => {
        const reviewCycle = individualsChart(dataset.reviewCycleTime);
        const rework = proportionChart(dataset.reworkRate);
        const atRisk = engagements.filter((e) => dataset.engagementsAtRisk.includes(e.id));
        const awaiting = workpapers.filter((w) => w.status === 'awaiting_review').length;
        const lastRework = rework.points[rework.points.length - 1];
        return {
          reviewCycle,
          rework,
          metrics: [
            {
              id: 'at-risk',
              label: 'Trabalhos em risco',
              value: String(atRisk.length),
              hint: atRisk.map((e) => e.client).join(' · '),
              icon: 'triangle-alert',
              tone: 'danger',
            },
            {
              id: 'awaiting-review',
              label: 'PTAs aguardando revisão',
              value: String(awaiting),
              hint: 'Em todos os trabalhos ativos',
              icon: 'hourglass',
              tone: 'warning',
            },
            {
              id: 'review-time',
              label: 'Tempo médio de revisão',
              value: `${formatDecimal(reviewCycle.center)} dias`,
              hint: `Últimas ${reviewCycle.points.length} semanas`,
              icon: 'clock',
              tone: 'neutral',
            },
            {
              id: 'rework-rate',
              label: 'Taxa atual de retrabalho',
              value: `${formatDecimal((lastRework?.value ?? 0) * 100)}%`,
              hint: `${lastRework?.label ?? ''} · média ${formatDecimal(rework.center * 100)}%`,
              icon: 'rotate-ccw',
              tone: 'neutral',
            },
          ],
        };
      }),
    );
  }
}
