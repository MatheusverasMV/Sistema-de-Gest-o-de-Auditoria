import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../core/auth/session.service';
import {
  WorkflowCommand,
  WorkflowCommandType,
  WorkflowError,
} from '../../../core/data/workpaper-workflow';
import {
  EXCEPTION_SEVERITY_META,
  REVIEW_CYCLE_RESULT_META,
  REVIEW_NOTE_SEVERITY_META,
  ReviewNote,
  ReviewNoteSeverity,
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
  FormField,
  FormInput,
  Icon,
  LoadingState,
  PageHeader,
  Person,
  ProgressBar,
  StatusBadge,
} from '../../../shared/ui';
import { AvailableAction, WorkpaperWorkflowService } from '../workpaper-workflow.service';
import { ReviewNotesPanel } from './review-notes-panel';
import { WorkpaperStatusFlow } from './status-flow';
import { WorkflowHistory } from './workflow-history';

export const WORKPAPER_SECTIONS = [
  { id: 'objetivo', label: 'Objetivo' },
  { id: 'base', label: 'Base utilizada' },
  { id: 'procedimentos', label: 'Procedimentos' },
  { id: 'resultados', label: 'Resultados' },
  { id: 'excecoes', label: 'Exceções' },
  { id: 'evidencias', label: 'Evidências' },
  { id: 'conclusao', label: 'Conclusão' },
  { id: 'historico', label: 'Histórico' },
  { id: 'revisao', label: 'Revisão' },
] as const;

type DialogKind = Exclude<WorkflowCommandType, 'resolve_note'> | 'resolve_note' | 'reset';

interface DialogState {
  readonly kind: DialogKind;
  readonly title: string;
  readonly note?: ReviewNote;
}

const SUCCESS: Record<WorkflowCommandType, string> = {
  start_preparation: 'Preparação iniciada.',
  submit: 'PTA enviado para revisão.',
  start_review: 'Revisão iniciada.',
  create_note: 'Ponto de revisão registrado.',
  resolve_note: 'Ponto de revisão marcado como resolvido.',
  return: 'PTA devolvido para correção.',
  approve: 'Revisão aprovada e PTA finalizado.',
};

@Component({
  selector: 'sga-workpaper-detail-page',
  imports: [
    RouterLink,
    CurrencyPipe,
    NgTemplateOutlet,
    FormsModule,
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
    FormField,
    FormInput,
    WorkpaperStatusFlow,
    WorkflowHistory,
    ReviewNotesPanel,
    CalendarDatePipe,
    RelativeTimePipe,
  ],
  templateUrl: './workpaper-detail-page.html',
  styleUrl: './workpaper-detail-page.scss',
})
export default class WorkpaperDetailPage {
  private readonly workflow = inject(WorkpaperWorkflowService);
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
  protected readonly noteSeverity = REVIEW_NOTE_SEVERITY_META;
  protected readonly cycleResult = REVIEW_CYCLE_RESULT_META;
  protected readonly actionIcon: Record<AvailableAction['type'], string> = {
    start_preparation: 'play',
    submit: 'send',
    start_review: 'eye',
    create_note: 'message-square',
    return: 'rotate-ccw',
    approve: 'shield-check',
  };
  protected readonly severityOptions = Object.keys(
    REVIEW_NOTE_SEVERITY_META,
  ) as ReviewNoteSeverity[];

  protected readonly data = rxResource({
    // A persona faz parte dos parâmetros: trocar de usuário recalcula as ações disponíveis.
    params: () => ({ id: this.id(), actor: this.session.currentUser()?.id }),
    stream: ({ params }) => this.workflow.view(params.id),
  });

  protected readonly workpaper = computed(() => this.data.value()?.workpaper);
  protected readonly engagement = computed(() => this.data.value()?.engagement);
  protected readonly state = computed(() => this.data.value()?.state);
  protected readonly actions = computed(() => this.data.value()?.actions ?? []);
  protected readonly blockedActions = computed(() => this.actions().filter((a) => !a.allowed));
  protected readonly resolvable = computed(
    () => this.data.value()?.resolvableNoteIds ?? new Set<string>(),
  );
  protected readonly storageError = computed(() => {
    const error = this.data.error();
    return error instanceof WorkflowError && error.code === 'corrupted_storage' ? error : null;
  });

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
    () => this.state()?.notes.filter((n) => n.status === 'open') ?? [],
  );
  protected readonly automationProcedure = computed(() =>
    this.workpaper()?.procedures.find((p) => p.automationId),
  );
  protected readonly currentCycle = computed(() => {
    const cycles = this.state()?.cycles ?? [];
    return cycles[cycles.length - 1] ?? null;
  });

  // Diálogo de confirmação das operações formais
  protected readonly dialog = signal<DialogState | null>(null);
  protected readonly busy = signal(false);
  protected readonly dialogError = signal<string | null>(null);
  protected readonly noteDescription = signal('');
  protected readonly noteSeverityValue = signal<ReviewNoteSeverity>('medium');
  protected readonly returnReason = signal('');
  protected readonly resolution = signal('');

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

  /** Quem pode executar a ação bloqueada, para orientar a troca de persona na demonstração. */
  protected responsibleFor(action: AvailableAction): string {
    const workpaper = this.workpaper();
    if (!workpaper || action.reason?.startsWith('Ação reservada') !== true) {
      return '';
    }
    const id = action.role === 'reviewer' ? workpaper.reviewerId : workpaper.preparerId;
    return `(${this.people.nameOf(id)})`;
  }

  protected openAction(action: AvailableAction): void {
    if (action.allowed) {
      this.openDialog({ kind: action.type, title: action.label });
    }
  }

  protected openResolve(note: ReviewNote): void {
    this.openDialog({ kind: 'resolve_note', title: `Resolver ${note.id}`, note });
  }

  protected openReset(): void {
    this.openDialog({ kind: 'reset', title: 'Restaurar histórico de demonstração' });
  }

  protected setDialogOpen(open: boolean): void {
    if (!open && !this.busy()) {
      this.dialog.set(null);
    }
  }

  protected confirm(): void {
    const dialog = this.dialog();
    const workpaper = this.workpaper();
    if (!dialog || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.dialogError.set(null);

    if (dialog.kind === 'reset') {
      this.workflow.resetDemo().subscribe({
        next: () =>
          this.finish('Histórico de demonstração restaurado. Uma cópia de segurança foi mantida.'),
        error: (e: unknown) => this.fail(e),
      });
      return;
    }
    if (!workpaper) {
      this.busy.set(false);
      return;
    }
    const command = this.commandFor(dialog);
    this.workflow.execute(workpaper.id, command).subscribe({
      next: () => this.finish(SUCCESS[command.type]),
      error: (e: unknown) => this.fail(e),
    });
  }

  private commandFor(dialog: DialogState): WorkflowCommand {
    switch (dialog.kind) {
      case 'create_note':
        return {
          type: 'create_note',
          description: this.noteDescription(),
          severity: this.noteSeverityValue(),
        };
      case 'return':
        return { type: 'return', reason: this.returnReason() };
      case 'resolve_note':
        return { type: 'resolve_note', noteId: dialog.note!.id, resolution: this.resolution() };
      case 'reset':
        throw new Error('Restauração não é um comando do workflow.');
      default:
        return { type: dialog.kind };
    }
  }

  private openDialog(state: DialogState): void {
    this.noteDescription.set('');
    this.noteSeverityValue.set('medium');
    this.returnReason.set('');
    this.resolution.set('');
    this.dialogError.set(null);
    this.dialog.set(state);
  }

  private finish(message: string): void {
    this.busy.set(false);
    this.dialog.set(null);
    this.toast.show(message);
    this.data.reload();
  }

  /** Nada foi gravado: o diálogo continua aberto com a explicação. */
  private fail(error: unknown): void {
    this.busy.set(false);
    this.dialogError.set(
      error instanceof WorkflowError ? error.message : 'Não foi possível concluir a operação.',
    );
  }
}
