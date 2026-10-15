import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { PRIORITY_META, roleLabel } from '../../core/models';
import { CalendarDatePipe, isOverdue } from '../../shared/pipes/pipes';
import {
  Card,
  CellDef,
  DataTable,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableColumn,
} from '../../shared/ui';
import { TaskRow, TaskService } from './task.service';

@Component({
  selector: 'sga-my-tasks-page',
  imports: [PageHeader, Card, DataTable, CellDef, StatusBadge, EmptyState, CalendarDatePipe],
  template: `
    <div class="page">
      <sga-page-header heading="Minhas Tarefas" [subheading]="subheading()" />
      <sga-card [flush]="true">
        @if (tasks.error()) {
          <sga-empty-state
            heading="Não foi possível carregar as tarefas"
            icon="circle-alert"
            tone="danger"
          />
        } @else {
          <sga-data-table
            caption="Minhas tarefas"
            [columns]="columns"
            [rows]="tasks.value()"
            [loading]="tasks.isLoading()"
            [interactive]="true"
            emptyHeading="Nenhuma tarefa atribuída"
            emptyDescription="Tarefas atribuídas a você nos trabalhos aparecerão aqui."
            (rowActivate)="open($event)"
          >
            <ng-template sgaCell="title" [sgaCellOf]="tasks.value()" let-row>
              <!-- A situação fica na coluna própria; o título só perde peso quando concluído. -->
              <span class="title" [class.done]="row.done">{{ row.title }}</span>
            </ng-template>
            <ng-template sgaCell="workpaper" [sgaCellOf]="tasks.value()" let-row>
              <span class="mono">{{ row.workpaperId ?? '—' }}</span>
            </ng-template>
            <ng-template sgaCell="priority" [sgaCellOf]="tasks.value()" let-row>
              <sga-status-badge
                [label]="priority[row.priority].label"
                [tone]="priority[row.priority].tone"
                kind="priority"
              />
            </ng-template>
            <ng-template sgaCell="dueDate" [sgaCellOf]="tasks.value()" let-row>
              <span class="mono" [class.overdue]="!row.done && isOverdue(row.dueDate)">
                {{ row.dueDate | calendarDate
                }}{{ !row.done && isOverdue(row.dueDate) ? ' · atrasada' : '' }}
              </span>
            </ng-template>
            <ng-template sgaCell="state" [sgaCellOf]="tasks.value()" let-row>
              <sga-status-badge
                [label]="row.done ? 'Concluída' : 'Em aberto'"
                [tone]="row.done ? 'success' : 'info'"
              />
            </ng-template>
          </sga-data-table>
        }
      </sga-card>
    </div>
  `,
  styles: `
    .title {
      font-weight: var(--fw-body);
      color: var(--text-primary);
    }
    .title.done {
      color: var(--text-secondary);
      font-weight: var(--fw-light);
    }
    .overdue {
      color: var(--danger-700);
      font-weight: var(--fw-strong);
    }
  `,
})
export default class MyTasksPage {
  private readonly service = inject(TaskService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  protected readonly priority = PRIORITY_META;
  protected readonly isOverdue = isOverdue;

  protected readonly columns: TableColumn[] = [
    { key: 'title', label: 'Tarefa' },
    { key: 'client', label: 'Cliente', width: '170px' },
    { key: 'workpaper', label: 'PTA', width: '130px' },
    { key: 'priority', label: 'Prioridade', width: '110px' },
    { key: 'dueDate', label: 'Prazo', width: '170px' },
    { key: 'state', label: 'Situação', width: '120px' },
  ];

  protected readonly subheading = computed(() => {
    const user = this.session.currentUser();
    return user ? `Tarefas atribuídas a ${user.name} · ${roleLabel(user)}` : '';
  });

  protected readonly tasks = rxResource({
    params: () => this.session.currentUser()?.id,
    stream: ({ params }) => this.service.forUser(params),
    defaultValue: [],
  });

  protected open(task: TaskRow): void {
    if (task.workpaperId) {
      this.router.navigate(['/workpapers', task.workpaperId]);
    } else {
      this.router.navigate(['/engagements', task.engagementId]);
    }
  }
}
