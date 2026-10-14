import { AuditEvent, WorkpaperStatus } from '../models';
import {
  canTransition,
  checkCommand,
  decideCommand,
  reconstituteWorkpaper,
  WORKPAPER_TRANSITIONS,
  WorkflowCommand,
  WorkflowError,
  WorkpaperWorkflowState,
} from './workpaper-workflow';

const WP = {
  id: 'PTA-REC-001',
  engagementId: 'eng-alfa-2026',
  preparerId: 'u-ana',
  reviewerId: 'u-rafael',
};
const PREPARER = 'u-ana';
const REVIEWER = 'u-rafael';

/** Simulador mínimo do log: aplica comandos como o serviço faria, sem Angular. */
class Harness {
  readonly log: AuditEvent[] = [];
  private minute = 0;

  constructor(readonly baseline: WorkpaperStatus = 'not_started') {}

  get state(): WorkpaperWorkflowState {
    return reconstituteWorkpaper(WP.id, this.baseline, this.log);
  }

  run(actorId: string | null, command: WorkflowCommand): AuditEvent[] {
    const decision = decideCommand(
      command,
      { workpaper: WP, state: this.state, actorId },
      {
        now: new Date(Date.UTC(2026, 9, 6, 12, this.minute++)).toISOString(),
        nextSequence: this.log.length + 1,
      },
    );
    if (!decision.ok) throw decision.error;
    this.log.push(...decision.events);
    return [...decision.events];
  }

  fails(actorId: string | null, command: WorkflowCommand): WorkflowError {
    const before = this.log.length;
    try {
      this.run(actorId, command);
    } catch (error) {
      expect(this.log.length).toBe(before); // nada foi registrado
      return error as WorkflowError;
    }
    throw new Error('O comando deveria ter falhado.');
  }

  /** Atalho: do início até "Em revisão" no ciclo atual. */
  toReview(): this {
    if (this.state.status === 'not_started' || this.state.status === 'with_issues') {
      this.run(PREPARER, { type: 'start_preparation' });
    }
    this.run(PREPARER, { type: 'submit' });
    this.run(REVIEWER, { type: 'start_review' });
    return this;
  }
}

describe('Máquina de estados do PTA', () => {
  it('declara exatamente as transições do fluxo formal', () => {
    expect(WORKPAPER_TRANSITIONS).toEqual({
      not_started: ['in_preparation'],
      in_preparation: ['awaiting_review'],
      awaiting_review: ['in_review'],
      in_review: ['with_issues', 'finalized'],
      with_issues: ['in_preparation'],
      finalized: [],
    });
  });

  it('bloqueia atalhos arbitrários', () => {
    expect(canTransition('not_started', 'finalized')).toBe(false);
    expect(canTransition('in_preparation', 'finalized')).toBe(false);
    expect(canTransition('awaiting_review', 'finalized')).toBe(false);
    expect(canTransition('with_issues', 'finalized')).toBe(false);
    expect(canTransition('with_issues', 'awaiting_review')).toBe(false);
    expect(canTransition('finalized', 'in_preparation')).toBe(false);
  });

  it('percorre todas as transições válidas com os eventos correspondentes', () => {
    const h = new Harness();
    const steps: [string | null, WorkflowCommand, WorkpaperStatus, string[]][] = [
      [PREPARER, { type: 'start_preparation' }, 'in_preparation', ['PREPARATION_STARTED']],
      [PREPARER, { type: 'submit' }, 'awaiting_review', ['SUBMITTED_FOR_REVIEW']],
      [REVIEWER, { type: 'start_review' }, 'in_review', ['REVIEW_STARTED']],
      [
        REVIEWER,
        { type: 'return', reason: 'Falta conciliação.' },
        'with_issues',
        ['RETURNED_FOR_CORRECTION'],
      ],
      [PREPARER, { type: 'start_preparation' }, 'in_preparation', ['PREPARATION_STARTED']],
      [PREPARER, { type: 'submit' }, 'awaiting_review', ['RESUBMITTED']],
      [REVIEWER, { type: 'start_review' }, 'in_review', ['REVIEW_STARTED']],
      [REVIEWER, { type: 'approve' }, 'finalized', ['REVIEW_APPROVED', 'WORKPAPER_FINALIZED']],
    ];
    for (const [actor, command, status, types] of steps) {
      expect(h.run(actor, command).map((e) => e.eventType)).toEqual(types);
      expect(h.state.status).toBe(status);
    }
    expect(h.state.anomalies).toEqual([]);
  });
});

describe('Comandos inválidos não geram eventos', () => {
  it('aprovar diretamente da preparação', () => {
    const h = new Harness();
    h.run(PREPARER, { type: 'start_preparation' });
    expect(h.fails(REVIEWER, { type: 'approve' }).code).toBe('invalid_transition');
  });

  it('iniciar revisão sem submissão', () => {
    const h = new Harness();
    h.run(PREPARER, { type: 'start_preparation' });
    expect(h.fails(REVIEWER, { type: 'start_review' }).code).toBe('invalid_transition');
  });

  it('enviar um PTA não iniciado', () => {
    expect(new Harness().fails(PREPARER, { type: 'submit' }).code).toBe('invalid_transition');
  });

  it('finalizar com pendência aberta', () => {
    const h = new Harness().toReview();
    h.run(REVIEWER, { type: 'create_note', description: 'Ajustar amostra.', severity: 'high' });
    const error = h.fails(REVIEWER, { type: 'approve' });
    expect(error.code).toBe('precondition_failed');
    expect(h.state.status).toBe('in_review');
  });

  it('devolver sem justificativa nem review note', () => {
    const h = new Harness().toReview();
    expect(h.fails(REVIEWER, { type: 'return', reason: '  ' }).code).toBe('precondition_failed');
  });

  it('reenviar com pontos ainda abertos', () => {
    const h = new Harness().toReview();
    h.run(REVIEWER, { type: 'create_note', description: 'Ponto A', severity: 'medium' });
    h.run(REVIEWER, { type: 'return', reason: '' });
    h.run(PREPARER, { type: 'start_preparation' });
    expect(h.fails(PREPARER, { type: 'submit' }).code).toBe('precondition_failed');
  });

  it('nada é possível após a finalização (reabertura fica fora deste incremento)', () => {
    const h = new Harness().toReview();
    h.run(REVIEWER, { type: 'approve' });
    expect(h.fails(PREPARER, { type: 'start_preparation' }).code).toBe('invalid_transition');
  });

  it('respeita preparador e revisor e exige usuário na sessão', () => {
    const h = new Harness();
    expect(h.fails(null, { type: 'start_preparation' }).code).toBe('no_actor');
    expect(h.fails(REVIEWER, { type: 'start_preparation' }).code).toBe('not_authorized');
    h.run(PREPARER, { type: 'start_preparation' });
    h.run(PREPARER, { type: 'submit' });
    expect(h.fails(PREPARER, { type: 'start_review' }).code).toBe('not_authorized');
    expect(h.fails('u-matheus', { type: 'start_review' }).code).toBe('not_authorized');
  });

  it('checkCommand não exige payload para avaliar disponibilidade', () => {
    const h = new Harness();
    const context = { workpaper: WP, state: h.state, actorId: PREPARER };
    expect(checkCommand('start_preparation', context)).toBeNull();
    expect(checkCommand('submit', context)?.code).toBe('invalid_transition');
  });
});

describe('Ciclos de revisão e review notes (cenário completo)', () => {
  const h = new Harness();
  h.run(PREPARER, { type: 'start_preparation' });
  h.run(PREPARER, { type: 'submit' });
  h.run(REVIEWER, { type: 'start_review' });
  const [n1] = h.run(REVIEWER, {
    type: 'create_note',
    description: 'Vincular amostra.',
    severity: 'high',
  });
  const [n2] = h.run(REVIEWER, {
    type: 'create_note',
    description: 'Referência cruzada.',
    severity: 'low',
  });
  h.run(REVIEWER, { type: 'return', reason: '' });
  h.run(PREPARER, { type: 'start_preparation' });
  const noteIds = h.state.notes.map((n) => n.id);
  for (const id of noteIds) {
    h.run(PREPARER, { type: 'resolve_note', noteId: id, resolution: 'Corrigido.' });
  }
  h.run(PREPARER, { type: 'submit' });
  h.run(REVIEWER, { type: 'start_review' });
  h.run(REVIEWER, { type: 'approve' });
  const final = h.state;

  it('produz dois ciclos: o primeiro devolvido e o segundo aprovado', () => {
    expect(final.cycles.map((c) => [c.id, c.sequence, c.result])).toEqual([
      ['RC-PTA-REC-001-1', 1, 'returned'],
      ['RC-PTA-REC-001-2', 2, 'approved'],
    ]);
    const [first, second] = final.cycles;
    expect(first).toMatchObject({
      submittedBy: PREPARER,
      reviewerId: REVIEWER,
      completedBy: REVIEWER,
    });
    expect(first.returnReason).toBe('2 ponto(s) de revisão em aberto.');
    expect(second.submittedAt! > first.completedAt!).toBe(true);
    expect(final.status).toBe('finalized');
    expect(final.activeCycle).toBeNull();
  });

  it('preserva os review notes resolvidos no ciclo de origem', () => {
    expect(n1.eventType).toBe('REVIEW_NOTE_CREATED');
    expect(n2.eventType).toBe('REVIEW_NOTE_CREATED');
    expect(final.notes).toHaveLength(2);
    for (const note of final.notes) {
      expect(note).toMatchObject({
        reviewCycleId: 'RC-PTA-REC-001-1',
        status: 'resolved',
        createdBy: REVIEWER,
        assignedTo: PREPARER,
        resolvedBy: PREPARER,
        resolution: 'Corrigido.',
      });
    }
  });

  it('eventos são rastreáveis, únicos e sem duplicação', () => {
    const ids = h.log.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(h.log.map((e) => e.sequence)).toEqual(h.log.map((_, i) => i + 1));
    expect(h.log.map((e) => e.eventType)).toEqual([
      'PREPARATION_STARTED',
      'SUBMITTED_FOR_REVIEW',
      'REVIEW_STARTED',
      'REVIEW_NOTE_CREATED',
      'REVIEW_NOTE_CREATED',
      'RETURNED_FOR_CORRECTION',
      'PREPARATION_STARTED',
      'REVIEW_NOTE_RESOLVED',
      'REVIEW_NOTE_RESOLVED',
      'RESUBMITTED',
      'REVIEW_STARTED',
      'REVIEW_APPROVED',
      'WORKPAPER_FINALIZED',
    ]);
    for (const event of h.log) {
      expect(event).toMatchObject({
        schemaVersion: 1,
        eventCategory: 'formal',
        engagementId: 'eng-alfa-2026',
        workpaperId: 'PTA-REC-001',
        source: 'sga',
      });
      expect(event.actorId).toBeTruthy();
      expect(event.recordedAt >= event.occurredAt).toBe(true);
    }
  });

  it('aprovação e finalização formam uma operação lógica correlacionada', () => {
    const [approved, finalized] = h.log.slice(-2);
    expect(finalized.causationId).toBe(approved.id);
    expect(finalized.correlationId).toBe(approved.correlationId);
    expect(approved.reviewCycleId).toBe('RC-PTA-REC-001-2');
  });

  it('o reenvio referencia o ciclo anterior sem reutilizar seu identificador', () => {
    const resubmitted = h.log.find((e) => e.eventType === 'RESUBMITTED')!;
    expect(resubmitted.reviewCycleId).toBe('RC-PTA-REC-001-2');
    expect(resubmitted.payload).toMatchObject({ previousCycleId: 'RC-PTA-REC-001-1' });
  });
});

describe('Reconstituição do estado a partir do histórico', () => {
  it('sem eventos, preserva o status herdado do mock', () => {
    const state = reconstituteWorkpaper('PTA-CR-001', 'in_review', []);
    expect(state).toMatchObject({ status: 'in_review', hasHistory: false, cycles: [], notes: [] });
  });

  it('PTA herdado em revisão abre um ciclo "legacy" sem data de envio', () => {
    const h = new Harness('in_review');
    h.run(REVIEWER, { type: 'create_note', description: 'Ponto', severity: 'medium' });
    h.run(REVIEWER, { type: 'return', reason: 'Ajustes.' });
    expect(h.state.cycles).toEqual([
      expect.objectContaining({
        origin: 'legacy',
        sequence: 1,
        result: 'returned',
      }),
    ]);
    expect(h.state.cycles[0].submittedAt).toBeUndefined();
  });

  it('PTA herdado com pendência é reenviado como RESUBMITTED', () => {
    const h = new Harness('with_issues');
    h.run(PREPARER, { type: 'start_preparation' });
    expect(h.run(PREPARER, { type: 'submit' }).map((e) => e.eventType)).toEqual(['RESUBMITTED']);
  });

  it('a ordem é determinística, independente da ordem de gravação', () => {
    const h = new Harness().toReview();
    const shuffled = [...h.log].reverse();
    expect(reconstituteWorkpaper(WP.id, 'not_started', shuffled)).toEqual(h.state);
  });

  it('evento antigo recebido fora de ordem não substitui o estado mais recente', () => {
    const h = new Harness().toReview();
    h.run(REVIEWER, { type: 'approve' });
    const late = {
      ...h.log[0],
      id: 'EV-IMPORT-1',
      sequence: 99,
      eventType: 'PREPARATION_STARTED',
      occurredAt: '2026-10-06T13:00:00.000Z', // depois da finalização
      source: 'import',
    } as AuditEvent;
    const state = reconstituteWorkpaper(WP.id, 'not_started', [...h.log, late]);
    expect(state.status).toBe('finalized');
    expect(state.anomalies).toEqual([
      expect.objectContaining({ eventId: 'EV-IMPORT-1', eventType: 'PREPARATION_STARTED' }),
    ]);
  });

  it('com anomalias no histórico, novas ações formais ficam bloqueadas', () => {
    const h = new Harness();
    h.log.push({ ...decideBroken(), id: 'EV-X' });
    expect(h.state.anomalies).toHaveLength(1);
    expect(h.fails(PREPARER, { type: 'start_preparation' }).code).toBe('precondition_failed');
  });

  it('ignora eventos de outros PTAs e eventos operacionais', () => {
    const h = new Harness().toReview();
    const other = { ...h.log[0], id: 'EV-O', sequence: 50, entityId: 'PTA-FOL-001' } as AuditEvent;
    const card = {
      ...h.log[0],
      id: 'EV-C',
      sequence: 51,
      eventType: 'BOARD_CARD_MOVED',
      eventCategory: 'operational',
      entityType: 'board_card',
      entityId: 'C-05',
      payload: { boardId: 'board-alfa-2026', toColumn: 'done' },
    } as AuditEvent;
    expect(reconstituteWorkpaper(WP.id, 'not_started', [...h.log, other, card]).status).toBe(
      'in_review',
    );
  });
});

/** Evento formal que viola a máquina de estados (aprovação sem revisão). */
function decideBroken(): AuditEvent {
  return {
    id: 'EV-B',
    schemaVersion: 1,
    sequence: 1,
    eventType: 'WORKPAPER_FINALIZED',
    eventCategory: 'formal',
    entityType: 'workpaper',
    entityId: WP.id,
    engagementId: WP.engagementId,
    workpaperId: WP.id,
    actorId: REVIEWER,
    occurredAt: '2026-10-06T12:00:00.000Z',
    recordedAt: '2026-10-06T12:00:00.000Z',
    source: 'sga',
    payload: {},
  };
}
