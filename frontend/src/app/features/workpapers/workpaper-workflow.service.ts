import { inject, Injectable } from '@angular/core';
import {
  catchError,
  combineLatest,
  defer,
  forkJoin,
  map,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import {
  ActivityRepository,
  EngagementRepository,
  WorkflowRepository,
  WorkpaperRepository,
} from '../../core/data/repositories';
import {
  latestRecordedAt,
  nextSequence,
  WORKFLOW_CLOCK,
  WorkflowLog,
} from '../../core/data/workflow-log';
import { workflowStateOf } from '../../core/data/workflow-projection';
import {
  checkCommand,
  COMMAND_ROLE,
  COMMAND_STATUSES,
  CommandContext,
  decideCommand,
  eventId,
  WorkflowCommand,
  WorkflowCommandType,
  WorkflowError,
  WorkflowRole,
  WorkpaperWorkflowState,
} from '../../core/data/workpaper-workflow';
import {
  AUDIT_EVENT_SCHEMA_VERSION,
  BoardCard,
  BoardCardEvent,
  BoardColumnId,
  Engagement,
  Workpaper,
  WorkpaperEvent,
} from '../../core/models';

export interface AvailableAction {
  readonly type: Exclude<WorkflowCommandType, 'resolve_note'>;
  readonly label: string;
  readonly role: WorkflowRole;
  /** A persona atual pode executar agora? Se não, `reason` explica. */
  readonly allowed: boolean;
  readonly reason?: string;
}

export interface WorkpaperWorkflowView {
  readonly workpaper: Workpaper;
  readonly engagement: Engagement | undefined;
  readonly state: WorkpaperWorkflowState;
  readonly actions: readonly AvailableAction[];
  /** Pontos que a persona atual pode marcar como resolvidos. */
  readonly resolvableNoteIds: ReadonlySet<string>;
}

export interface WorkflowResult {
  readonly workpaper: Workpaper;
  readonly state: WorkpaperWorkflowState;
  readonly events: readonly WorkpaperEvent[];
}

const ACTIVITY_LABELS: Record<WorkflowCommandType, string> = {
  start_preparation: 'iniciou a preparação de',
  submit: 'enviou para revisão',
  start_review: 'iniciou a revisão de',
  create_note: 'registrou ponto de revisão em',
  resolve_note: 'resolveu ponto de revisão em',
  return: 'devolveu para correção',
  approve: 'aprovou e finalizou',
};

/**
 * Única autoridade para atos formais do PTA:
 * validação → eventos → gravação única do histórico → status projetado.
 * O autor é sempre o usuário da sessão; a tela nunca informa um actorId.
 */
@Injectable({ providedIn: 'root' })
export class WorkpaperWorkflowService {
  private readonly history = inject(WorkflowRepository);
  private readonly workpapers = inject(WorkpaperRepository);
  private readonly engagements = inject(EngagementRepository);
  private readonly activity = inject(ActivityRepository);
  private readonly session = inject(SessionService);
  private readonly clock = inject(WORKFLOW_CLOCK);

  /** PTA + estado formal + ações disponíveis para a persona atual. */
  view(workpaperId: string): Observable<WorkpaperWorkflowView | null> {
    return combineLatest([
      this.workpapers.get(workpaperId),
      this.engagements.list(),
      this.history.load(),
    ]).pipe(
      map(([workpaper, engagements, log]) => {
        if (!workpaper) {
          return null;
        }
        const state = workflowStateOf(workpaper, log);
        const context: CommandContext = { workpaper, state, actorId: this.actorId() };
        return {
          workpaper,
          engagement: engagements.find((e) => e.id === workpaper.engagementId),
          state,
          actions: availableActions(context),
          resolvableNoteIds: new Set(
            state.notes
              .filter((n) => !checkCommand({ type: 'resolve_note', noteId: n.id }, context))
              .map((n) => n.id),
          ),
        };
      }),
    );
  }

  /**
   * Executa um ato formal. Em erro (validação, conflito ou falha de gravação) nada é
   * gravado e o Observable emite WorkflowError — a tela não deve confirmar a operação.
   */
  execute(workpaperId: string, command: WorkflowCommand): Observable<WorkflowResult> {
    return defer(() => forkJoin([this.history.load(), this.workpapers.get(workpaperId)])).pipe(
      switchMap(([log, workpaper]) => {
        if (!workpaper) {
          throw new WorkflowError('not_found', `PTA ${workpaperId} não encontrado.`);
        }
        const state = workflowStateOf(workpaper, log);
        const now = this.now(log);
        const decision = decideCommand(
          command,
          { workpaper, state, actorId: this.actorId() },
          { now, nextSequence: nextSequence(log) },
        );
        if (!decision.ok) {
          throw decision.error;
        }
        return this.history
          .append({
            expectedRevision: log.revision,
            events: decision.events,
            // O status herdado do mock é registrado só na primeira operação do PTA.
            baselines: log.baselines[workpaper.id]
              ? undefined
              : { [workpaper.id]: { status: workpaper.status, capturedAt: now } },
          })
          .pipe(
            map((next) => {
              const nextState = workflowStateOf(workpaper, next);
              return {
                workpaper: { ...workpaper, status: nextState.status, updatedAt: now },
                state: nextState,
                events: decision.events,
              };
            }),
            tap((result) => this.logActivity(command, result.workpaper, now)),
          );
      }),
    );
  }

  /**
   * Registra uma movimentação de cartão como evento OPERACIONAL. Nunca chama atos
   * formais: arrastar um cartão para "Concluído" não aprova o PTA.
   */
  recordCardMove(
    card: BoardCard,
    boardId: string,
    fromColumn: BoardColumnId | undefined,
    toColumn: BoardColumnId,
  ): Observable<BoardCardEvent> {
    return this.history.load().pipe(
      switchMap((log) => {
        const now = this.now(log);
        const sequence = nextSequence(log);
        const event: BoardCardEvent = {
          id: eventId(sequence),
          schemaVersion: AUDIT_EVENT_SCHEMA_VERSION,
          sequence,
          eventType: 'BOARD_CARD_MOVED',
          eventCategory: 'operational',
          entityType: 'board_card',
          entityId: card.id,
          engagementId: card.engagementId,
          workpaperId: card.workpaperId,
          actorId: this.actorId() ?? undefined,
          occurredAt: now,
          recordedAt: now,
          source: 'sga',
          payload: { boardId, fromColumn, toColumn },
        };
        return this.history
          .append({ expectedRevision: log.revision, events: [event] })
          .pipe(map(() => event));
      }),
    );
  }

  /** Recurso de demonstração: limpa o histórico (com cópia de segurança). */
  resetDemo(): Observable<WorkflowLog> {
    return this.history.reset();
  }

  private actorId(): string | null {
    return this.session.currentUser()?.id ?? null;
  }

  /** Relógio monotônico: nunca anterior ao último registro (o relógio do protótipo reinicia no reload). */
  private now(log: WorkflowLog): string {
    const latest = latestRecordedAt(log);
    const clock = this.clock().getTime();
    return new Date(latest ? Math.max(clock, Date.parse(latest) + 1) : clock).toISOString();
  }

  private logActivity(command: WorkflowCommand, workpaper: Workpaper, at: string): void {
    const actorId = this.actorId();
    if (!actorId) return;
    this.activity
      .add({
        actorId,
        action: ACTIVITY_LABELS[command.type],
        target: `${workpaper.id} — ${workpaper.area}`,
        link: `/workpapers/${workpaper.id}`,
        at,
      })
      // O feed de atividades é complementar: falhar aqui não desfaz o ato formal.
      .pipe(catchError(() => of(null)))
      .subscribe();
  }
}

/** Ações que fazem sentido no status atual, marcando as que a persona pode executar. */
export function availableActions(context: CommandContext): AvailableAction[] {
  const { state } = context;
  const resubmission =
    state.cycles[state.cycles.length - 1]?.result === 'returned' ||
    (state.cycles.length === 0 && state.baselineStatus === 'with_issues');
  const labels: Record<AvailableAction['type'], string> = {
    start_preparation: state.status === 'with_issues' ? 'Retomar preparação' : 'Iniciar preparação',
    submit: resubmission ? 'Reenviar para revisão' : 'Enviar para revisão',
    start_review: 'Iniciar revisão',
    create_note: 'Adicionar ponto de revisão',
    return: 'Devolver para correção',
    approve: 'Aprovar e finalizar',
  };
  return (Object.keys(labels) as AvailableAction['type'][])
    .filter((type) => COMMAND_STATUSES[type].includes(state.status))
    .map((type) => {
      const error = checkCommand(type, context);
      return {
        type,
        label: labels[type],
        role: COMMAND_ROLE[type],
        allowed: !error,
        reason: error?.message,
      };
    });
}
