import { EnvironmentProviders, Injectable, makeEnvironmentProviders } from '@angular/core';
import { delay, Observable, of, throwError } from 'rxjs';
import { MOCK_LATENCY_MS, prototypeNow, STORAGE_KEYS } from '../../config/prototype.config';
import { ACTIVITIES, NOTIFICATIONS } from '../../mocks/activity.mock';
import { LEDGER_ANALYSES } from '../../mocks/analytics.mock';
import {
  AUTOMATION_EXECUTIONS,
  AUTOMATIONS,
  buildSampleItems,
  SAMPLE_POPULATION,
} from '../../mocks/automations.mock';
import { BOARDS } from '../../mocks/boards.mock';
import { ENGAGEMENTS } from '../../mocks/engagements.mock';
import { QUALITY_DATASET } from '../../mocks/quality.mock';
import { TASKS } from '../../mocks/tasks.mock';
import { USERS } from '../../mocks/users.mock';
import { WORKPAPERS } from '../../mocks/workpapers.mock';
import {
  Activity,
  AppNotification,
  Automation,
  AutomationExecution,
  Board,
  Engagement,
  Evidence,
  LedgerAnalysis,
  QualityDataset,
  SampleSelectionConfig,
  SampleSelectionResult,
  Task,
  User,
  Workpaper,
  WorkpaperStatus,
} from '../../models';
import {
  ActivityRepository,
  AnalyticsRepository,
  AutomationRepository,
  BoardRepository,
  EngagementRepository,
  QualityRepository,
  TaskRepository,
  UserRepository,
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
class MockEngagementRepository extends EngagementRepository {
  list(): Observable<Engagement[]> {
    return respond([...ENGAGEMENTS]);
  }

  get(id: string): Observable<Engagement | null> {
    return respond(ENGAGEMENTS.find((e) => e.id === id) ?? null);
  }
}

/** Mantém o estado em memória: alterações persistem durante a sessão e são descartadas no reload. */
@Injectable()
class MockWorkpaperRepository extends WorkpaperRepository {
  private workpapers: Workpaper[] = [...WORKPAPERS];

  list(): Observable<Workpaper[]> {
    return respond([...this.workpapers]);
  }

  get(id: string): Observable<Workpaper | null> {
    return respond(this.workpapers.find((w) => w.id === id) ?? null);
  }

  updateStatus(id: string, status: WorkpaperStatus): Observable<Workpaper> {
    return this.update(id, (w) => ({ ...w, status }));
  }

  addEvidence(
    id: string,
    evidence: Evidence,
    completedProcedureId?: string,
  ): Observable<Workpaper> {
    return this.update(id, (w) => ({
      ...w,
      evidences: [...w.evidences, evidence],
      procedures: w.procedures.map((p) =>
        p.id === completedProcedureId ? { ...p, done: true } : p,
      ),
    }));
  }

  private update(id: string, change: (w: Workpaper) => Workpaper): Observable<Workpaper> {
    const current = this.workpapers.find((w) => w.id === id);
    if (!current) {
      return notFound('PTA', id);
    }
    const updated = { ...change(current), updatedAt: prototypeNow().toISOString() };
    this.workpapers = this.workpapers.map((w) => (w.id === id ? updated : w));
    return respond(updated);
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
class MockAnalyticsRepository extends AnalyticsRepository {
  ledgerAnalysis(engagementId: string): Observable<LedgerAnalysis | null> {
    return respond(LEDGER_ANALYSES.find((a) => a.engagementId === engagementId) ?? null);
  }
}

/** Liga cada contrato de repositório à sua implementação mock. Trocar aqui por provideHttpRepositories() no futuro. */
export function provideMockRepositories(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: UserRepository, useClass: MockUserRepository },
    { provide: EngagementRepository, useClass: MockEngagementRepository },
    { provide: WorkpaperRepository, useClass: MockWorkpaperRepository },
    { provide: TaskRepository, useClass: MockTaskRepository },
    { provide: BoardRepository, useClass: MockBoardRepository },
    { provide: AutomationRepository, useClass: MockAutomationRepository },
    { provide: ActivityRepository, useClass: MockActivityRepository },
    { provide: QualityRepository, useClass: MockQualityRepository },
    { provide: AnalyticsRepository, useClass: MockAnalyticsRepository },
  ]);
}
