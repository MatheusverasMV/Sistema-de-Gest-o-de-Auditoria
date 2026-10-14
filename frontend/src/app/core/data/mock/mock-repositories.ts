import { EnvironmentProviders, inject, Injectable, makeEnvironmentProviders } from '@angular/core';
import { catchError, defer, delay, map, Observable, of, throwError } from 'rxjs';
import { MOCK_LATENCY_MS, prototypeNow, STORAGE_KEYS } from '../../config/prototype.config';
import {
  EMPTY_WORKFLOW_LOG,
  nextSequence,
  parseWorkflowLog,
  serializeWorkflowLog,
  WORKFLOW_STORAGE,
  WorkflowLog,
} from '../workflow-log';
import { projectWorkpaper } from '../workflow-projection';
import { WorkflowError } from '../workpaper-workflow';
import { ACTIVITIES, NOTIFICATIONS } from '../../mocks/activity.mock';
import { LEDGER_ANALYSES } from '../../mocks/analytics.mock';
import {
  AUTOMATION_EXECUTIONS,
  AUTOMATIONS,
  buildSampleItems,
  SAMPLE_POPULATION,
} from '../../mocks/automations.mock';
import { BOARDS } from '../../mocks/boards.mock';
import { AUDIT_AREAS, CLIENTS } from '../../mocks/clients.mock';
import { ENGAGEMENT_CATALOG, ENGAGEMENTS } from '../../mocks/engagements.mock';
import { EXTERNAL_REFERENCES } from '../../mocks/external-references.mock';
import { QUALITY_DATASET } from '../../mocks/quality.mock';
import { TASKS } from '../../mocks/tasks.mock';
import { USERS } from '../../mocks/users.mock';
import { WORKPAPERS } from '../../mocks/workpapers.mock';
import {
  Activity,
  AppNotification,
  AuditArea,
  Automation,
  AutomationExecution,
  Board,
  Client,
  Engagement,
  EngagementIdentity,
  Evidence,
  ExternalReference,
  LedgerAnalysis,
  QualityDataset,
  SampleSelectionConfig,
  SampleSelectionResult,
  Task,
  User,
  Workpaper,
} from '../../models';
import {
  ActivityRepository,
  AnalyticsRepository,
  AutomationRepository,
  BoardRepository,
  EngagementRepository,
  ExternalReferenceRepository,
  QualityRepository,
  ReferenceDataRepository,
  TaskRepository,
  UserRepository,
  WorkflowAppend,
  WorkflowRepository,
  WorkpaperRepository,
} from '../repositories';

function respond<T>(value: T): Observable<T> {
  return of(value).pipe(delay(MOCK_LATENCY_MS));
}

function notFound(entity: string, id: string): Observable<never> {
  return throwError(() => new Error(`${entity} ${id} não encontrado.`));
}

let sequence = 200;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
}

@Injectable()
class MockUserRepository extends UserRepository {
  list(): Observable<User[]> {
    return respond([...USERS]);
  }
}

@Injectable()
class MockReferenceDataRepository extends ReferenceDataRepository {
  clients(): Observable<Client[]> {
    return respond([...CLIENTS]);
  }

  auditAreas(): Observable<AuditArea[]> {
    return respond([...AUDIT_AREAS]);
  }
}

@Injectable()
class MockEngagementRepository extends EngagementRepository {
  list(): Observable<Engagement[]> {
    return respond([...ENGAGEMENTS]);
  }

  get(id: string): Observable<Engagement | null> {
    return respond(ENGAGEMENTS.find((e) => e.id === id) ?? null);
  }

  identities(): Observable<EngagementIdentity[]> {
    return respond([...ENGAGEMENT_CATALOG]);
  }
}

/**
 * Histórico de eventos persistido no navegador (um documento versionado). Cada append grava
 * o documento inteiro de uma vez: ou todos os eventos da operação entram, ou nenhum entra.
 * Dados inválidos nunca são apagados automaticamente — só por restauração explícita.
 */
@Injectable()
class MockWorkflowRepository extends WorkflowRepository {
  private readonly storage = inject(WORKFLOW_STORAGE);

  load(): Observable<WorkflowLog> {
    return defer(() => of(this.read()));
  }

  append(change: WorkflowAppend): Observable<WorkflowLog> {
    return defer(() => {
      const current = this.read();
      if (current.revision !== change.expectedRevision) {
        throw new WorkflowError(
          'conflict',
          'O histórico foi alterado em outra janela. Recarregue a página e tente novamente.',
        );
      }
      const ids = new Set(current.events.map((e) => e.id));
      const lastSequence = nextSequence(current) - 1;
      if (change.events.some((e) => ids.has(e.id) || e.sequence <= lastSequence)) {
        throw new WorkflowError('conflict', 'Eventos com identificador ou sequência já usados.');
      }
      const baselines = { ...current.baselines };
      for (const [id, baseline] of Object.entries(change.baselines ?? {})) {
        baselines[id] ??= baseline;
      }
      const next: WorkflowLog = {
        ...current,
        revision: current.revision + 1,
        baselines,
        events: [...current.events, ...change.events],
      };
      this.write(next);
      return of(next);
    });
  }

  reset(): Observable<WorkflowLog> {
    return defer(() => {
      const raw = this.storage.getItem(STORAGE_KEYS.workflow);
      if (raw !== null) {
        this.storage.setItem(STORAGE_KEYS.workflowBackup, raw);
      }
      this.write(EMPTY_WORKFLOW_LOG);
      return of(EMPTY_WORKFLOW_LOG);
    });
  }

  private read(): WorkflowLog {
    let raw: string | null;
    try {
      raw = this.storage.getItem(STORAGE_KEYS.workflow);
    } catch {
      throw new WorkflowError('storage_failure', 'Armazenamento local indisponível.');
    }
    const parsed = parseWorkflowLog(raw);
    if (!parsed.ok) {
      throw new WorkflowError(
        'corrupted_storage',
        `Histórico salvo inválido (${parsed.reason}). Os dados foram preservados; restaure a demonstração para continuar.`,
      );
    }
    return parsed.log;
  }

  private write(log: WorkflowLog): void {
    try {
      this.storage.setItem(STORAGE_KEYS.workflow, serializeWorkflowLog(log));
    } catch {
      throw new WorkflowError('storage_failure', 'Não foi possível gravar o histórico.');
    }
  }
}

/**
 * PTAs mantidos em memória (evidências da sessão). O status devolvido é o formal: projeção
 * do histórico de eventos sobre o status herdado do mock. Sem histórico legível, vale o
 * status herdado — a tela do PTA sinaliza o problema do histórico.
 */
@Injectable()
class MockWorkpaperRepository extends WorkpaperRepository {
  private readonly workflow = inject(WorkflowRepository);
  private workpapers: Workpaper[] = [...WORKPAPERS];

  list(): Observable<Workpaper[]> {
    return this.projected().pipe(
      map((project) => this.workpapers.map(project)),
      delay(MOCK_LATENCY_MS),
    );
  }

  get(id: string): Observable<Workpaper | null> {
    return this.projected().pipe(
      map((project) => {
        const workpaper = this.workpapers.find((w) => w.id === id);
        return workpaper ? project(workpaper) : null;
      }),
      delay(MOCK_LATENCY_MS),
    );
  }

  addEvidence(
    id: string,
    evidence: Evidence,
    completedProcedureId?: string,
  ): Observable<Workpaper> {
    const current = this.workpapers.find((w) => w.id === id);
    if (!current) {
      return notFound('PTA', id);
    }
    const updated: Workpaper = {
      ...current,
      evidences: [...current.evidences, evidence],
      procedures: current.procedures.map((p) =>
        p.id === completedProcedureId ? { ...p, done: true } : p,
      ),
      updatedAt: prototypeNow().toISOString(),
    };
    this.workpapers = this.workpapers.map((w) => (w.id === id ? updated : w));
    return this.projected().pipe(
      map((project) => project(updated)),
      delay(MOCK_LATENCY_MS),
    );
  }

  private projected(): Observable<(workpaper: Workpaper) => Workpaper> {
    return this.workflow.load().pipe(
      map((log) => (workpaper: Workpaper) => projectWorkpaper(workpaper, log)),
      catchError(() => of((workpaper: Workpaper) => workpaper)),
    );
  }
}

@Injectable()
class MockTaskRepository extends TaskRepository {
  list(): Observable<Task[]> {
    return respond([...TASKS]);
  }
}

/** Quadros persistem em localStorage para que a organização feita na demo sobreviva ao reload. */
@Injectable()
class MockBoardRepository extends BoardRepository {
  list(): Observable<Board[]> {
    return respond(BOARDS.map((seed) => this.read(seed.id) ?? seed));
  }

  save(board: Board): Observable<Board> {
    this.write(board.id, board);
    return of(board);
  }

  reset(id: string): Observable<Board> {
    const seed = BOARDS.find((b) => b.id === id);
    if (!seed) {
      return notFound('Quadro', id);
    }
    try {
      localStorage.removeItem(STORAGE_KEYS.board(id));
    } catch {
      // Armazenamento indisponível: o quadro segue apenas em memória.
    }
    return respond(seed);
  }

  private read(id: string): Board | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.board(id));
      return raw ? (JSON.parse(raw) as Board) : null;
    } catch {
      return null;
    }
  }

  private write(id: string, board: Board): void {
    try {
      localStorage.setItem(STORAGE_KEYS.board(id), JSON.stringify(board));
    } catch {
      // Armazenamento indisponível: o quadro segue apenas em memória.
    }
  }
}

@Injectable()
class MockAutomationRepository extends AutomationRepository {
  private executions: AutomationExecution[] = [...AUTOMATION_EXECUTIONS];

  list(): Observable<Automation[]> {
    return respond([...AUTOMATIONS]);
  }

  get(id: string): Observable<Automation | null> {
    return respond(AUTOMATIONS.find((a) => a.id === id) ?? null);
  }

  listExecutions(): Observable<AutomationExecution[]> {
    return respond([...this.executions].sort((a, b) => b.executedAt.localeCompare(a.executedAt)));
  }

  runSampleSelection(
    config: SampleSelectionConfig,
    executedById: string,
    workpaperId?: string,
  ): Observable<SampleSelectionResult> {
    const items = buildSampleItems(config.materiality);
    const coveredValue = items.reduce((sum, item) => sum + item.amount, 0);
    const execution: AutomationExecution = {
      id: nextId('EXE'),
      automationId: 'sample-selection',
      engagementId: config.engagementId,
      workpaperId,
      executedById,
      executedAt: prototypeNow().toISOString(),
      status: 'success',
      summary: `${items.length} itens selecionados de ${SAMPLE_POPULATION.count.toLocaleString('pt-BR')} lançamentos`,
    };
    this.executions = [execution, ...this.executions];
    return respond({
      executionId: execution.id,
      config,
      populationCount: SAMPLE_POPULATION.count,
      populationValue: SAMPLE_POPULATION.value,
      items,
      coveredValue,
      coverage: coveredValue / SAMPLE_POPULATION.value,
    });
  }

  linkExecution(executionId: string, workpaperId: string): Observable<AutomationExecution> {
    const execution = this.executions.find((e) => e.id === executionId);
    if (!execution) {
      return notFound('Execução', executionId);
    }
    const linked = { ...execution, workpaperId };
    this.executions = this.executions.map((e) => (e.id === executionId ? linked : e));
    return respond(linked);
  }
}

@Injectable()
class MockActivityRepository extends ActivityRepository {
  private activities: Activity[] = [...ACTIVITIES];

  list(): Observable<Activity[]> {
    return respond([...this.activities]);
  }

  add(activity: Omit<Activity, 'id'>): Observable<Activity> {
    const created = { ...activity, id: nextId('A') };
    this.activities = [created, ...this.activities];
    return of(created);
  }

  notifications(): Observable<AppNotification[]> {
    return respond([...NOTIFICATIONS]);
  }
}

@Injectable()
class MockQualityRepository extends QualityRepository {
  dataset(): Observable<QualityDataset> {
    return respond(QUALITY_DATASET);
  }
}

@Injectable()
class MockExternalReferenceRepository extends ExternalReferenceRepository {
  list(): Observable<ExternalReference[]> {
    return respond([...EXTERNAL_REFERENCES]);
  }
}

@Injectable()
class MockAnalyticsRepository extends AnalyticsRepository {
  ledgerAnalysis(engagementId: string): Observable<LedgerAnalysis | null> {
    return respond(LEDGER_ANALYSES.find((a) => a.engagementId === engagementId) ?? null);
  }
}

/** Liga cada contrato de repositório à sua implementação mock. Trocar aqui por provideHttpRepositories() no futuro. */
export function provideMockRepositories(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: UserRepository, useClass: MockUserRepository },
    { provide: ReferenceDataRepository, useClass: MockReferenceDataRepository },
    { provide: EngagementRepository, useClass: MockEngagementRepository },
    { provide: WorkflowRepository, useClass: MockWorkflowRepository },
    { provide: WorkpaperRepository, useClass: MockWorkpaperRepository },
    { provide: TaskRepository, useClass: MockTaskRepository },
    { provide: BoardRepository, useClass: MockBoardRepository },
    { provide: AutomationRepository, useClass: MockAutomationRepository },
    { provide: ActivityRepository, useClass: MockActivityRepository },
    { provide: QualityRepository, useClass: MockQualityRepository },
    { provide: AnalyticsRepository, useClass: MockAnalyticsRepository },
    { provide: ExternalReferenceRepository, useClass: MockExternalReferenceRepository },
  ]);
}
