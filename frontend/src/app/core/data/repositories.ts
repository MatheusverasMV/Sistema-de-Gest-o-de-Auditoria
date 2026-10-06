import { Observable } from 'rxjs';
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
} from '../models';

/*
 * Contratos de acesso a dados. Componentes e serviços de feature dependem apenas
 * destas classes abstratas; hoje são satisfeitas por implementações mock e, no
 * futuro, por implementações HTTP sobre a API Django — sem mudança nas telas.
 * Todas retornam Observable para casar com o HttpClient.
 */

export abstract class UserRepository {
  abstract list(): Observable<User[]>;
}

export abstract class EngagementRepository {
  abstract list(): Observable<Engagement[]>;
  abstract get(id: string): Observable<Engagement | null>;
}

export abstract class WorkpaperRepository {
  abstract list(): Observable<Workpaper[]>;
  abstract get(id: string): Observable<Workpaper | null>;
  abstract updateStatus(id: string, status: WorkpaperStatus): Observable<Workpaper>;
  /** Anexa uma evidência e, opcionalmente, marca como concluído o procedimento que a originou. */
  abstract addEvidence(
    id: string,
    evidence: Evidence,
    completedProcedureId?: string,
  ): Observable<Workpaper>;
}

export abstract class TaskRepository {
  abstract list(): Observable<Task[]>;
}

export abstract class BoardRepository {
  abstract list(): Observable<Board[]>;
  abstract save(board: Board): Observable<Board>;
  abstract reset(id: string): Observable<Board>;
}

export abstract class AutomationRepository {
  abstract list(): Observable<Automation[]>;
  abstract get(id: string): Observable<Automation | null>;
  abstract listExecutions(): Observable<AutomationExecution[]>;
  abstract runSampleSelection(
    config: SampleSelectionConfig,
    executedById: string,
    workpaperId?: string,
  ): Observable<SampleSelectionResult>;
  abstract linkExecution(executionId: string, workpaperId: string): Observable<AutomationExecution>;
}

export abstract class ActivityRepository {
  abstract list(): Observable<Activity[]>;
  abstract add(activity: Omit<Activity, 'id'>): Observable<Activity>;
  abstract notifications(): Observable<AppNotification[]>;
}

export abstract class QualityRepository {
  abstract dataset(): Observable<QualityDataset>;
}

export abstract class AnalyticsRepository {
  abstract ledgerAnalysis(engagementId: string): Observable<LedgerAnalysis | null>;
}
