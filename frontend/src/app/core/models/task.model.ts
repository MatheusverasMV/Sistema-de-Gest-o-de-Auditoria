import { Priority } from './status.model';

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly engagementId: string;
  readonly workpaperId?: string;
  readonly assigneeId: string;
  readonly dueDate: string;
  readonly priority: Priority;
  readonly done: boolean;
}
