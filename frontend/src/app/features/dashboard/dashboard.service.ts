import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import {
  ActivityRepository,
  AutomationRepository,
  EngagementRepository,
  TaskRepository,
  WorkpaperRepository,
} from '../../core/data/repositories';
import {
  Activity,
  Automation,
  AutomationExecution,
  Engagement,
  OPEN_WORKPAPER_STATUSES,
  Task,
} from '../../core/models';

export interface DashboardSummary {
  readonly kpis: {
    readonly activeEngagements: number;
    readonly openWorkpapers: number;
    readonly awaitingReview: number;
    readonly criticalIssues: number;
  };
  readonly engagements: readonly Engagement[];
  readonly myTasks: readonly (Task & { readonly client: string })[];
  readonly activities: readonly Activity[];
  readonly executions: readonly (AutomationExecution & {
    readonly automation?: Automation;
    readonly client: string;
  })[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly engagementRepo = inject(EngagementRepository);
  private readonly workpaperRepo = inject(WorkpaperRepository);
  private readonly taskRepo = inject(TaskRepository);
  private readonly activityRepo = inject(ActivityRepository);
  private readonly automationRepo = inject(AutomationRepository);

  summary(userId: string): Observable<DashboardSummary> {
    return combineLatest([
      this.engagementRepo.list(),
      this.workpaperRepo.list(),
      this.taskRepo.list(),
      this.activityRepo.list(),
      this.automationRepo.list(),
      this.automationRepo.listExecutions(),
    ]).pipe(
      map(([engagements, workpapers, tasks, activities, automations, executions]) => {
        const clientOf = (engagementId: string) =>
          engagements.find((e) => e.id === engagementId)?.client ?? '—';
        const active = engagements.filter((e) => e.status !== 'completed');
        const open = workpapers.filter((w) => OPEN_WORKPAPER_STATUSES.includes(w.status));
        return {
          kpis: {
            activeEngagements: active.length,
            openWorkpapers: open.length,
            awaitingReview: workpapers.filter((w) => w.status === 'awaiting_review').length,
            // Exceções de alta severidade ainda não resolvidas + PTAs devolvidos com pendência.
            criticalIssues:
              workpapers
                .flatMap((w) => w.exceptions)
                .filter((ex) => ex.severity === 'high' && !ex.resolved).length +
              workpapers.filter((w) => w.status === 'with_issues').length,
          },
          engagements: [...active].sort((a, b) => a.reportDueDate.localeCompare(b.reportDueDate)),
          myTasks: tasks
            .filter((t) => t.assigneeId === userId && !t.done)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .map((t) => ({ ...t, client: clientOf(t.engagementId) })),
          activities: activities.slice(0, 6),
          executions: executions.slice(0, 4).map((e) => ({
            ...e,
            automation: automations.find((a) => a.id === e.automationId),
            client: clientOf(e.engagementId),
          })),
        };
      }),
    );
  }
}
