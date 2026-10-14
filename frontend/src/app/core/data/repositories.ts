import { Observable } from 'rxjs';
import { WorkflowBaseline, WorkflowLog } from './workflow-log';
import {
  Activity,
  AppNotification,
  AuditArea,
  AuditEvent,
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

/** Dados de referência compartilhados: clientes e áreas de auditoria. */
export abstract class ReferenceDataRepository {
  abstract clients(): Observable<Client[]>;
  abstract auditAreas(): Observable<AuditArea[]>;
}

export abstract class EngagementRepository {
  /** Trabalhos operacionais (registro completo). */
  abstract list(): Observable<Engagement[]>;
  abstract get(id: string): Observable<Engagement | null>;
  /** Identidades de todos os trabalhos conhecidos, inclusive históricos sem registro operacional. */
  abstract identities(): Observable<EngagementIdentity[]>;
}

export abstract class WorkpaperRepository {
  abstract list(): Observable<Workpaper[]>;
  /** O status devolvido é o formal: projeção do histórico de eventos sobre o status herdado. */
  abstract get(id: string): Observable<Workpaper | null>;
  /** Anexa uma evidência e, opcionalmente, marca como concluído o procedimento que a originou. */
  abstract addEvidence(
    id: string,
    evidence: Evidence,
    completedProcedureId?: string,
  ): Observable<Workpaper>;
}

/** Uma operação formal: todos os seus eventos são gravados juntos ou nenhum é gravado. */
export interface WorkflowAppend {
  /** Revisão lida antes de decidir a operação; diferente da atual ⇒ conflito, nada é gravado. */
  readonly expectedRevision: number;
  readonly events: readonly AuditEvent[];
  /** Status herdado de PTAs que entram no histórico nesta operação (nunca sobrescritos). */
  readonly baselines?: Readonly<Record<string, WorkflowBaseline>>;
}

/**
 * Histórico de eventos (append-only). Única fonte do estado formal dos PTAs.
 * Erros são WorkflowError: `corrupted_storage`, `conflict` ou `storage_failure`.
 */
export abstract class WorkflowRepository {
  abstract load(): Observable<WorkflowLog>;
  abstract append(change: WorkflowAppend): Observable<WorkflowLog>;
  /** Restaura a demonstração (histórico vazio), guardando cópia do conteúdo anterior. */
  abstract reset(): Observable<WorkflowLog>;
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

/** Vínculos explícitos com plataformas externas (Trello). Vazio quando não há integração. */
export abstract class ExternalReferenceRepository {
  abstract list(): Observable<ExternalReference[]>;
}

export abstract class AnalyticsRepository {
  abstract ledgerAnalysis(engagementId: string): Observable<LedgerAnalysis | null>;
}
