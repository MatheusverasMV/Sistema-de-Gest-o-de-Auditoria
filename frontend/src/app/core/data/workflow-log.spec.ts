import {
  EMPTY_WORKFLOW_LOG,
  nextSequence,
  parseWorkflowLog,
  serializeWorkflowLog,
} from './workflow-log';

const event = (id: string, sequence: number) => ({
  id,
  sequence,
  schemaVersion: 1,
  eventType: 'SUBMITTED_FOR_REVIEW',
  eventCategory: 'formal',
  entityType: 'workpaper',
  entityId: 'PTA-REC-001',
  engagementId: 'eng-alfa-2026',
  occurredAt: '2026-10-06T18:00:00.000Z',
  recordedAt: '2026-10-06T18:00:00.000Z',
  source: 'sga',
  payload: { reviewerId: 'u-rafael' },
});

describe('Formato persistido do histórico', () => {
  it('documento ausente equivale a histórico vazio', () => {
    expect(parseWorkflowLog(null)).toEqual({ ok: true, log: EMPTY_WORKFLOW_LOG });
  });

  it('serializa e lê de volta sem perdas', () => {
    const log = {
      ...EMPTY_WORKFLOW_LOG,
      revision: 3,
      baselines: {
        'PTA-REC-001': { status: 'in_preparation', capturedAt: '2026-10-06T18:00:00.000Z' },
      },
      events: [event('EV-000001', 1)],
    } as const;
    const parsed = parseWorkflowLog(serializeWorkflowLog(log as never));
    expect(parsed).toEqual({ ok: true, log });
    expect(nextSequence(log as never)).toBe(2);
  });

  it('identifica JSON inválido, versão desconhecida e estrutura inválida', () => {
    expect(parseWorkflowLog('{')).toEqual({ ok: false, reason: 'invalid_json' });
    expect(parseWorkflowLog(JSON.stringify({ ...EMPTY_WORKFLOW_LOG, schemaVersion: 2 }))).toEqual({
      ok: false,
      reason: 'unsupported_version',
    });
    expect(
      parseWorkflowLog(JSON.stringify({ ...EMPTY_WORKFLOW_LOG, events: [{ id: 1 }] })),
    ).toEqual({
      ok: false,
      reason: 'invalid_shape',
    });
    expect(
      parseWorkflowLog(
        JSON.stringify({
          ...EMPTY_WORKFLOW_LOG,
          baselines: { X: { status: 'aprovado', capturedAt: '' } },
        }),
      ),
    ).toEqual({ ok: false, reason: 'invalid_shape' });
  });

  it('rejeita ids ou sequências duplicados', () => {
    const duplicated = { ...EMPTY_WORKFLOW_LOG, events: [event('EV-1', 1), event('EV-1', 2)] };
    expect(parseWorkflowLog(JSON.stringify(duplicated))).toEqual({
      ok: false,
      reason: 'invalid_shape',
    });
  });
});
