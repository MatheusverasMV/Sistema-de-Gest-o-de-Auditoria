import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { prototypeNow } from '../../core/config/prototype.config';
import { ENGAGEMENT_STATUS_META, EXECUTION_STATUS_META, PRIORITY_META } from '../../core/models';
import { PeopleService } from '../../core/services/people.service';
import { CalendarDatePipe, isOverdue, RelativeTimePipe } from '../../shared/pipes/pipes';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Icon,
  KpiCard,
  LoadingState,
  PageHeader,
  ProgressBar,
  StatusBadge,
} from '../../shared/ui';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'sga-dashboard-page',
  imports: [
    RouterLink,
    PageHeader,
    KpiCard,
    Card,
    ProgressBar,
    StatusBadge,
    Avatar,
    Icon,
    Button,
    EmptyState,
    LoadingState,
    CalendarDatePipe,
    RelativeTimePipe,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export default class DashboardPage {
  private readonly service = inject(DashboardService);
  private readonly session = inject(SessionService);
  protected readonly people = inject(PeopleService);

  protected readonly engagementStatus = ENGAGEMENT_STATUS_META;
  protected readonly executionStatus = EXECUTION_STATUS_META;
  protected readonly priority = PRIORITY_META;
  protected readonly isOverdue = isOverdue;

  protected readonly user = this.session.currentUser;
  protected readonly firstName = computed(() => this.user()?.name.split(' ')[0] ?? '');
  protected readonly today = prototypeNow().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  protected readonly summary = rxResource({
    params: () => this.user()?.id,
    stream: ({ params: userId }) => this.service.summary(userId),
  });
}
