import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../core/auth/session.service';
import { STORAGE_KEYS } from '../../core/config/prototype.config';
import { provideMockRepositories } from '../../core/data/mock/mock-repositories';
import { WorkflowRepository, WorkpaperRepository } from '../../core/data/repositories';
import {
  KeyValueStorage,
  memoryStorage,
  WORKFLOW_CLOCK,
  WORKFLOW_STORAGE,
  WorkflowLog,
} from '../../core/data/workflow-log';
import { workflowFacts } from '../../core/data/workflow-projection';
import { WorkflowCommand, WorkflowError } from '../../core/data/workpaper-workflow';
import { BoardColumnId } from '../../core/models';
import { PeopleService } from '../../core/services/people.service';
import { BoardService } from '../workflow/board.service';
import { columnOf, findCard, moveCard } from '../workflow/board-logic';
import { WorkpaperWorkflowService } from './workpaper-workflow.service';

const WP = 'PTA-REC-001'; // preparadora Ana Souza, revisor Rafael Lima
const PREPARER = 'u-ana';
const REVIEWER = 'u-rafael';
const SLOW = 60_000; // os repositórios mock simulam latência de rede

/** Monta um "navegador": injetor novo sobre o mesmo armazenamento (simula recarregar a página). */
async function boot(storage: KeyValueStorage) {
  TestBed.resetTestingModule();
  let minute = 0;
  TestBed.configureTestingModule({
    providers: [
      provideMockRepositories(),
      { provide: WORKFLOW_STORAGE, useValue: storage },
      { provide: WORKFLOW_CLOCK, useValue: () => new Date(Date.UTC(2026, 9, 6, 18, minute++)) },
    ],
  });
  await TestBed.inject(PeopleService).load();
  const session = TestBed.inject(SessionService);
  const service = TestBed.inject(WorkpaperWorkflowService);
  return {
    service,
    as: (userId: string) => session.switchPersona(userId),
    run: (userId: string, command: WorkflowCommand) => {
      session.switchPersona(userId);
      return firstValueFrom(service.execute(WP, command));
    },
    view: () => firstValueFrom(service.view(WP)),
    log: () => firstValueFrom(TestBed.inject(WorkflowRepository).load()),
    workpaper: (id = WP) => firstValueFrom(TestBed.inject(WorkpaperRepository).get(id)),
    boards: () => firstValueFrom(TestBed.inject(BoardService).list()),
  };
}

async function columnOfCard(app: Awaited<ReturnType<typeof boot>>, cardId: string) {
  const summaries = await app.boards();
  const board = summaries.find((s) => findCard(s.board, cardId))!.board;
  return columnOf(board, cardId);
}

beforeEach(() => localStorage.clear());

describe('WorkpaperWorkflowService — persistência e autoridade', () => {
  it(
    'registra o evento com o autor da sessão e mantém estado e histórico após recarregar',
    async () => {
      const storage = memoryStorage();
      let app = await boot(storage);
      await app.run(PREPARER, { type: 'submit' });

      app = await boot(storage); // recarga
      expect((await app.workpaper())!.status).toBe('awaiting_review');
      const view = (await app.view())!;
      expect(view.state.events.map((e) => [e.eventType, e.actorId])).toEqual([
        ['SUBMITTED_FOR_REVIEW', PREPARER],
      ]);
      expect(view.state.cycles).toHaveLength(1);
      expect(view.state.baselineStatus).toBe('in_preparation'); // status herdado do mock
      const event = view.state.events[0];
      expect(event.occurredAt).toMatch(/Z$/); // ISO 8601 em UTC
      expect(event.recordedAt).toBe(event.occurredAt);
    },
    SLOW,
  );

  it(
    'o autor nunca vem da tela: a persona errada é recusada sem gravar nada',
    async () => {
      const storage = memoryStorage();
      const app = await boot(storage);
      await expect(app.run(REVIEWER, { type: 'submit' })).rejects.toMatchObject({
        code: 'not_authorized',
      });
      expect(storage.getItem(STORAGE_KEYS.workflow)).toBeNull();
      expect((await app.workpaper())!.status).toBe('in_preparation');
    },
    SLOW,
  );

  it(
    'sem usuário identificado, a operação é recusada',
    async () => {
      const app = await boot(memoryStorage());
      const session = TestBed.inject(SessionService);
      Object.defineProperty(session, 'currentUser', { value: () => null });
      await expect(
        firstValueFrom(app.service.execute(WP, { type: 'submit' })),
      ).rejects.toMatchObject({
        code: 'no_actor',
      });
    },
    SLOW,
  );

  it(
    'falha de gravação não confirma a operação nem deixa estado parcial',
    async () => {
      const healthy = memoryStorage();
      const failing: KeyValueStorage = {
        getItem: (k) => healthy.getItem(k),
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: (k) => healthy.removeItem(k),
      };
      const app = await boot(failing);
      const error = await app.run(PREPARER, { type: 'submit' }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(WorkflowError);
      expect((error as WorkflowError).code).toBe('storage_failure');
      expect((await app.log()).events).toEqual([]);
      expect((await app.workpaper())!.status).toBe('in_preparation');
    },
    SLOW,
  );

  it(
    'gravação concorrente (outra aba) é rejeitada como conflito',
    async () => {
      const app = await boot(memoryStorage());
      await app.run(PREPARER, { type: 'submit' });
      const repo = TestBed.inject(WorkflowRepository);
      await expect(
        firstValueFrom(repo.append({ expectedRevision: 0, events: [] })),
      ).rejects.toMatchObject({ code: 'conflict' });
    },
    SLOW,
  );

  it(
    'histórico corrompido não é apagado automaticamente; a restauração guarda cópia',
    async () => {
      const storage = memoryStorage();
      storage.setItem(STORAGE_KEYS.workflow, '{ isto não é JSON');
      const app = await boot(storage);
      await expect(app.view()).rejects.toMatchObject({ code: 'corrupted_storage' });
      // Outras telas continuam com o status herdado.
      expect((await app.workpaper())!.status).toBe('in_preparation');
      expect(storage.getItem(STORAGE_KEYS.workflow)).toBe('{ isto não é JSON');

      await firstValueFrom(app.service.resetDemo());
      expect(storage.getItem(STORAGE_KEYS.workflowBackup)).toBe('{ isto não é JSON');
      expect((await app.log()).events).toEqual([]);
    },
    SLOW,
  );

  it(
    'PTA sem histórico anterior começa a registrar a partir da primeira ação',
    async () => {
      const app = await boot(memoryStorage());
      const before = (await firstValueFrom(app.service.view('PTA-CR-001')))!;
      expect(before.state).toMatchObject({ status: 'in_review', hasHistory: false, cycles: [] });
    },
    SLOW,
  );
});

describe('Jornada completa com Kanban (cenários A–D)', () => {
  it(
    'dois ciclos, review notes preservados e cartão do PTA acompanhando o estado formal',
    async () => {
      const storage = memoryStorage();
      const app = await boot(storage);
      expect(await columnOfCard(app, 'C-05')).toBe('in_progress');

      // Cenário A — envio
      await app.run(PREPARER, { type: 'submit' });
      expect(await columnOfCard(app, 'C-05')).toBe('in_review');

      await app.run(REVIEWER, { type: 'start_review' });
      await app.run(REVIEWER, {
        type: 'create_note',
        description: 'Vincular amostra.',
        severity: 'high',
      });
      await app.run(REVIEWER, {
        type: 'create_note',
        description: 'Referência cruzada.',
        severity: 'low',
      });

      // Cenário B — devolução
      const returned = await app.run(REVIEWER, { type: 'return', reason: '' });
      expect(returned.workpaper.status).toBe('with_issues');
      expect(await columnOfCard(app, 'C-05')).toBe('issues');
      // O cartão de pendência ligado ao mesmo PTA não é tratado como o PTA.
      expect(await columnOfCard(app, 'C-09')).toBe('issues');

      await app.run(PREPARER, { type: 'start_preparation' });
      for (const note of (await app.view())!.state.notes) {
        await app.run(PREPARER, { type: 'resolve_note', noteId: note.id });
      }
      await app.run(PREPARER, { type: 'submit' });
      await app.run(REVIEWER, { type: 'start_review' });

      // Cenário C — aprovação
      const approved = await app.run(REVIEWER, { type: 'approve' });
      expect(approved.events.map((e) => e.eventType)).toEqual([
        'REVIEW_APPROVED',
        'WORKPAPER_FINALIZED',
      ]);
      expect(await columnOfCard(app, 'C-05')).toBe('done');

      const state = (await app.view())!.state;
      expect(state.status).toBe('finalized');
      expect(state.cycles.map((c) => c.result)).toEqual(['returned', 'approved']);
      expect(state.notes.every((n) => n.status === 'resolved')).toBe(true);

      // Recarregar a página não altera nada.
      const reloaded = await boot(storage);
      expect((await reloaded.view())!.state).toEqual(state);
      expect((await reloaded.workpaper())!.status).toBe('finalized');

      // Reler o quadro (projeção já aplicada) não gera eventos.
      const before = (await reloaded.log()).events.length;
      await reloaded.boards();
      await reloaded.boards();
      expect((await reloaded.log()).events.length).toBe(before);
    },
    SLOW,
  );

  it(
    'Cenário D — arrastar o cartão para Concluído é operacional e não aprova o PTA',
    async () => {
      const app = await boot(memoryStorage());
      const boardService = TestBed.inject(BoardService);
      const summary = (await app.boards()).find((s) => findCard(s.board, 'C-05'))!;
      const card = findCard(summary.board, 'C-05')!;
      const from = columnOf(summary.board, 'C-05')!;
      const to: BoardColumnId = 'done';

      // Mesmo caminho do quadro: grava a posição e registra o evento operacional.
      app.as(PREPARER);
      await firstValueFrom(boardService.save(moveCard(summary.board, 'C-05', to, null)));
      await firstValueFrom(app.service.recordCardMove(card, summary.board.id, from, to));

      const log: WorkflowLog = await app.log();
      expect(log.events.map((e) => [e.eventType, e.eventCategory])).toEqual([
        ['BOARD_CARD_MOVED', 'operational'],
      ]);
      expect((await app.workpaper())!.status).toBe('in_preparation');
      expect((await app.view())!.state.hasHistory).toBe(false);
      // A posição operacional é mantida; o quadro mostra o status formal separadamente.
      const after = (await app.boards()).find((s) => findCard(s.board, 'C-05'))!;
      expect(columnOf(after.board, 'C-05')).toBe('done');
      expect(after.workpaperStatuses.get(WP)).toBe('in_preparation');
    },
    SLOW,
  );
});

describe('Contrato para Qualidade (Incremento 02B)', () => {
  it(
    'expõe ciclos e review notes com dimensões de recorte',
    async () => {
      const app = await boot(memoryStorage());
      await app.run(PREPARER, { type: 'submit' });
      await app.run(REVIEWER, { type: 'start_review' });
      await app.run(REVIEWER, { type: 'create_note', description: 'Ponto', severity: 'medium' });
      const facts = workflowFacts(await app.log(), (id) =>
        id === WP
          ? {
              workpaperId: id,
              engagementId: 'eng-alfa-2026',
              clientId: 'cli-alfa',
              auditArea: 'Receita',
            }
          : undefined,
      );
      expect(facts.cycles).toEqual([
        expect.objectContaining({
          workpaperId: WP,
          clientId: 'cli-alfa',
          auditArea: 'Receita',
          sequence: 1,
          origin: 'recorded',
          result: 'in_progress',
          notesCreated: 1,
        }),
      ]);
      expect(facts.cycles[0].submittedAt).toBeTruthy();
      expect(facts.cycles[0].reviewStartedAt).toBeTruthy();
      expect(facts.notes).toEqual([
        expect.objectContaining({
          severity: 'medium',
          status: 'open',
          cycleId: 'RC-PTA-REC-001-1',
        }),
      ]);
    },
    SLOW,
  );
});
