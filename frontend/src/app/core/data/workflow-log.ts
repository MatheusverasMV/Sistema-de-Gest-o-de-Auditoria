import { InjectionToken } from '@angular/core';
import { prototypeNow } from '../config/prototype.config';
import { AuditEvent, WORKPAPER_STATUS_META, WorkpaperStatus } from '../models';

/*
 * Formato persistido do histórico de eventos (persistência demonstrativa, sem backend).
 * Um único documento versionado guarda tudo o que é necessário para recuperar status,
 * ciclos e review notes: os eventos (append-only) e o status herdado de cada PTA no
 * momento em que entrou no histórico. Cada operação grava o documento inteiro de uma vez.
 */

export const WORKFLOW_LOG_SCHEMA_VERSION = 1;

/** Status do mock no momento do primeiro evento do PTA (o que havia antes do histórico). */
export interface WorkflowBaseline {
  readonly status: WorkpaperStatus;
  readonly capturedAt: string;
}

export interface WorkflowLog {
  readonly schemaVersion: typeof WORKFLOW_LOG_SCHEMA_VERSION;
  /** Incrementa a cada gravação; protege contra gravações concorrentes (outra aba). */
  readonly revision: number;
  readonly baselines: Readonly<Record<string, WorkflowBaseline>>;
  readonly events: readonly AuditEvent[];
}

export const EMPTY_WORKFLOW_LOG: WorkflowLog = {
  schemaVersion: WORKFLOW_LOG_SCHEMA_VERSION,
  revision: 0,
  baselines: {},
  events: [],
};

export type WorkflowLogParseResult =
  | { readonly ok: true; readonly log: WorkflowLog }
  | {
      readonly ok: false;
      readonly reason: 'invalid_json' | 'unsupported_version' | 'invalid_shape';
    };

/** Lê o documento salvo. Ausente ⇒ log vazio. Nunca descarta dados inválidos por conta própria. */
export function parseWorkflowLog(raw: string | null): WorkflowLogParseResult {
  if (raw === null) {
    return { ok: true, log: EMPTY_WORKFLOW_LOG };
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }
  if (!isRecord(data)) {
    return { ok: false, reason: 'invalid_shape' };
  }
  if (data['schemaVersion'] !== WORKFLOW_LOG_SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported_version' };
  }
  const { revision, baselines, events } = data;
  if (
    typeof revision !== 'number' ||
    !isRecord(baselines) ||
    !Object.values(baselines).every(isBaseline) ||
    !Array.isArray(events) ||
    !events.every(isEventLike)
  ) {
    return { ok: false, reason: 'invalid_shape' };
  }
  const ids = new Set(events.map((e) => e.id));
  const sequences = new Set(events.map((e) => e.sequence));
  if (ids.size !== events.length || sequences.size !== events.length) {
    return { ok: false, reason: 'invalid_shape' };
  }
  return {
    ok: true,
    log: {
      schemaVersion: WORKFLOW_LOG_SCHEMA_VERSION,
      revision,
      baselines: baselines as Record<string, WorkflowBaseline>,
      events: events as AuditEvent[],
    },
  };
}

export function serializeWorkflowLog(log: WorkflowLog): string {
  return JSON.stringify(log);
}

/** Próximo número de sequência livre. */
export function nextSequence(log: WorkflowLog): number {
  return log.events.reduce((max, e) => Math.max(max, e.sequence), 0) + 1;
}

/** Instante de registro mais recente do log (para manter o relógio monotônico). */
export function latestRecordedAt(log: WorkflowLog): string | null {
  return log.events.reduce<string | null>(
    (max, e) => (max === null || e.recordedAt > max ? e.recordedAt : max),
    null,
  );
}

/** Armazenamento chave-valor (subconjunto do Web Storage), injetável para simular falhas. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const WORKFLOW_STORAGE = new InjectionToken<KeyValueStorage>('WORKFLOW_STORAGE', {
  providedIn: 'root',
  factory: () => (typeof localStorage === 'undefined' ? memoryStorage() : localStorage),
});

/** Relógio do workflow (padrão: relógio do protótipo). Injetável para testes. */
export const WORKFLOW_CLOCK = new InjectionToken<() => Date>('WORKFLOW_CLOCK', {
  providedIn: 'root',
  factory: () => prototypeNow,
});

export function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBaseline(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value['status'] === 'string' &&
    value['status'] in WORKPAPER_STATUS_META &&
    typeof value['capturedAt'] === 'string'
  );
}

function isEventLike(value: unknown): value is AuditEvent {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['sequence'] === 'number' &&
    typeof value['eventType'] === 'string' &&
    typeof value['entityType'] === 'string' &&
    typeof value['entityId'] === 'string' &&
    typeof value['occurredAt'] === 'string' &&
    typeof value['recordedAt'] === 'string' &&
    isRecord(value['payload'])
  );
}
