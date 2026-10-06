import { inject, Injectable } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { EngagementRepository, TaskRepository } from '../../core/data/repositories';
import { Task } from '../../core/models';

export interface TaskRow extends Task {
  readonly client: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly tasks = inject(TaskRepository);
  private readonly engagements = inject(EngagementRepository);

  forUser(userId: string): Observable<TaskRow[]> {
    return combineLatest([this.tasks.list(), this.engagements.list()]).pipe(
      map(([tasks, engagements]) =>
        tasks
          .filter((t) => t.assigneeId === userId)
          .sort((a, b) => Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate))
          .map((t) => ({
            ...t,
            client: engagements.find((e) => e.id === t.engagementId)?.client ?? '—',
          })),
      ),
    );
  }
}
