import { inject, Injectable } from '@angular/core';
import { combineLatest, forkJoin, map, Observable, switchMap, throwError } from 'rxjs';
import { prototypeNow } from '../../core/config/prototype.config';
import {
  ActivityRepository,
  AutomationRepository,
  EngagementRepository,
  WorkpaperRepository,
} from '../../core/data/repositories';
import {
  Automation,
  AutomationExecution,
  Engagement,
  Evidence,
  SampleSelectionConfig,
  SampleSelectionResult,
  Workpaper,
} from '../../core/models';

export interface ExecutionRow extends AutomationExecution {
  readonly automationName: string;
  readonly client: string;
}

export interface RunContext {
  readonly engagements: readonly Engagement[];
  readonly workpapers: readonly Workpaper[];
}

export interface LinkOutcome {
  readonly workpaper: Workpaper;
  readonly evidenceId: string;
}

@Injectable({ providedIn: 'root' })
export class AutomationService {
  private readonly automations = inject(AutomationRepository);
  private readonly engagements = inject(EngagementRepository);
  private readonly workpapers = inject(WorkpaperRepository);
  private readonly activity = inject(ActivityRepository);

  list(): Observable<Automation[]> {
    return this.automations.list();
  }

  get(id: string): Observable<Automation | null> {
    return this.automations.get(id);
  }

  recentExecutions(): Observable<ExecutionRow[]> {
    return combineLatest([
      this.automations.listExecutions(),
      this.automations.list(),
      this.engagements.list(),
    ]).pipe(
      map(([executions, automations, engagements]) =>
        executions.map((e) => ({
          ...e,
          automationName: automations.find((a) => a.id === e.automationId)?.name ?? e.automationId,
          client: engagements.find((eng) => eng.id === e.engagementId)?.client ?? '—',
        })),
      ),
    );
  }

  /** Trabalhos ativos e seus PTAs, para escolher onde executar e vincular o resultado. */
  runContext(): Observable<RunContext> {
    return combineLatest([this.engagements.list(), this.workpapers.list()]).pipe(
      map(([engagements, workpapers]) => ({
        engagements: engagements.filter((e) => e.status !== 'completed'),
        workpapers,
      })),
    );
  }

  runSampleSelection(
    config: SampleSelectionConfig,
    userId: string,
    workpaperId?: string,
  ): Observable<SampleSelectionResult> {
    return this.automations.runSampleSelection(config, userId, workpaperId);
  }

  /**
   * Vincula o resultado ao PTA: anexa a evidência, conclui o procedimento associado
   * à automação, registra o vínculo na execução e gera atividade.
   */
  linkToWorkpaper(
    result: SampleSelectionResult,
    workpaperId: string,
    actorId: string,
  ): Observable<LinkOutcome> {
    const evidence: Evidence = {
      id: `EV-${result.executionId}`,
      name: `Seleção de Amostras — ${result.executionId}.xlsx`,
      kind: 'automation',
      addedById: actorId,
      addedAt: prototypeNow().toISOString(),
      description: `${result.items.length} itens · cobertura ${(result.coverage * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`,
      executionId: result.executionId,
    };
    return this.workpapers.get(workpaperId).pipe(
      switchMap((workpaper) => {
        if (!workpaper) {
          return throwError(() => new Error(`PTA ${workpaperId} não encontrado.`));
        }
        const procedure = workpaper.procedures.find(
          (p) => p.automationId === 'sample-selection' && !p.done,
        );
        return forkJoin([
          this.workpapers.addEvidence(workpaperId, evidence, procedure?.id),
          this.automations.linkExecution(result.executionId, workpaperId),
          this.activity.add({
            actorId,
            action: 'vinculou resultado de Seleção de Amostras a',
            target: `${workpaper.id} — ${workpaper.area}`,
            link: `/workpapers/${workpaper.id}`,
            at: evidence.addedAt,
          }),
        ]);
      }),
      map(([workpaper]) => ({ workpaper, evidenceId: evidence.id })),
    );
  }
}
