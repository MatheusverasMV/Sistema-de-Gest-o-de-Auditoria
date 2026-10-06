import { CurrencyPipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import {
  canSubmitForReview,
  EXCEPTION_SEVERITY_META,
  WORKPAPER_STATUS_META,
} from '../../../core/models';
import { PeopleService } from '../../../core/services/people.service';
import { ToastService } from '../../../core/services/toast.service';
import { CalendarDatePipe, RelativeTimePipe } from '../../../shared/pipes/pipes';
import {
  BreadcrumbItem,
  Button,
  Card,
  Drawer,
  EmptyState,
  Icon,
  LoadingState,
  PageHeader,
  Person,
  ProgressBar,
  StatusBadge,
} from '../../../shared/ui';
import { WorkpaperService } from '../workpaper.service';
import { WorkpaperStatusFlow } from './status-flow';

export const WORKPAPER_SECTIONS = [
  { id: 'objetivo', label: 'Objetivo' },
  { id: 'base', label: 'Base utilizada' },
  { id: 'procedimentos', label: 'Procedimentos' },
  { id: 'resultados', label: 'Resultados' },
  { id: 'excecoes', label: 'Exceções' },
  { id: 'evidencias', label: 'Evidências' },
  { id: 'conclusao', label: 'Conclusão' },
  { id: 'revisao', label: 'Revisão' },
] as const;

@Component({
  selector: 'sga-workpaper-detail-page',
  imports: [
    RouterLink,
    CurrencyPipe,
    PageHeader,
    Card,
    StatusBadge,
    Person,
    ProgressBar,
    Button,
    Icon,
    EmptyState,
    LoadingState,
    Drawer,
    WorkpaperStatusFlow,
    CalendarDatePipe,
    RelativeTimePipe,
  ],
  templateUrl: './workpaper-detail-page.html',
  styleUrl: './workpaper-detail-page.scss',
})
export default class WorkpaperDetailPage {
  private readonly service = inject(WorkpaperService);
  private readonly session = inject(SessionService);
  private readonly toast = inject(ToastService);
  private readonly injector = inject(Injector);
  protected readonly people = inject(PeopleService);

  /** Parâmetro de rota. */
  readonly id = input.required<string>();
  /** Evidência recém-vinculada a destacar (?highlight=). */
  readonly highlight = input<string>();

  protected readonly sections = WORKPAPER_SECTIONS;
  protected readonly statusMeta = WORKPAPER_STATUS_META;
  protected readonly severity = EXCEPTION_SEVERITY_META;

  protected readonly data = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.service.get(params),
  });

  protected readonly workpaper = computed(() => this.data.value()?.workpaper);
  protected readonly engagement = computed(() => this.data.value()?.engagement);

  protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => {
    const engagement = this.engagement();
    return [
      { label: 'Trabalhos', link: '/engagements' },
      ...(engagement
        ? [
            {
              label: engagement.client,
              link: ['/engagements', engagement.id],
              queryParams: { tab: 'workpapers' },
            },
          ]
        : []),
      { label: this.id() },
    ];
  });

  protected readonly proceduresDone = computed(
    () => this.workpaper()?.procedures.filter((p) => p.done).length ?? 0,
  );
  protected readonly openNotes = computed(
    () => this.workpaper()?.reviewNotes.filter((n) => !n.resolved).length ?? 0,
  );
  protected readonly automationProcedure = computed(() =>
    this.workpaper()?.procedures.find((p) => p.automationId),
  );
  protected readonly canSubmit = computed(() => {
    const workpaper = this.workpaper();
    return !!workpaper && canSubmitForReview(workpaper.status);
  });

  protected readonly submitOpen = signal(false);
  protected readonly submitting = signal(false);

  constructor() {
    effect(() => {
      if (this.highlight() && this.workpaper()) {
        afterNextRender(
          () =>
            document
              .getElementById('evidencias')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
          { injector: this.injector },
        );
      }
    });
  }

  protected submitForReview(): void {
    const current = this.data.value();
    const user = this.session.currentUser();
    if (!current || !user) {
      return;
    }
    this.submitting.set(true);
    this.service.submitForReview(current.workpaper, user.id).subscribe({
      next: (updated) => {
        this.data.set({ ...current, workpaper: updated });
        this.submitting.set(false);
        this.submitOpen.set(false);
        this.toast.show(
          `${updated.id} enviado para revisão de ${this.people.nameOf(updated.reviewerId)}.`,
        );
      },
      error: () => {
        this.submitting.set(false);
        this.toast.show('Não foi possível enviar o PTA para revisão.', 'danger');
      },
    });
  }
}
