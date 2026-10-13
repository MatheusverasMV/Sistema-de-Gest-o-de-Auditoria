import {
  Client,
  ControlBaseline,
  EngagementIdentity,
  engagementShortTitle,
  HoursObservation,
  IndividualObservation,
  ObservationContext,
  PeriodCountRecord,
  QualityDataset,
} from '../models';
import { AUDIT_AREAS, CLIENTS } from './clients.mock';
import { ENGAGEMENT_CATALOG } from './engagements.mock';

/*
 * Dados fictícios e determinísticos do módulo Qualidade & Processos (out/25 a set/26).
 * Contêm causas especiais deliberadas para a demonstração — os testes em
 * features/quality garantem que cada uma continue aparecendo:
 *
 * - Retrabalho: abr/26 acima do LSC (17 de 52), concentrado em Gama S.A. · Receita.
 * - Pontos de revisão: ago/26 acima do LSC, concentrado em Empresa Alfa S.A. · Contas a Receber.
 * - Solicitações vencidas: seis meses consecutivos de alta (abr/26 → set/26), puxada por Gama S.A.
 * - Ciclo de revisão: dois PTAs fora de controle e um trecho final de variabilidade elevada.
 * - Resolução de pontos: seis observações finais continuamente crescentes.
 * - Desvio de horas: uma atividade de Gama S.A. 62% acima do orçamento; valores negativos presentes.
 *
 * Identidade: clientes, trabalhos e áreas vêm do catálogo compartilhado (clients.mock.ts,
 * engagements.mock.ts). Os códigos de PTA ("PTA-FOR-314") e de review note ("RN-143") das
 * observações individuais são códigos da fonte estatística demonstrativa: NÃO correspondem
 * a PTAs operacionais e por isso ficam em `workpaperCode`/`eventCode`, nunca nos campos
 * canônicos `workpaperId`/`eventId`.
 */

type ClientKey = 'alfa' | 'beta' | 'gama';

/** Clientes do catálogo compartilhado (clients.mock.ts), por apelido local. */
const CLIENT_ID: Record<ClientKey, string> = {
  alfa: 'cli-alfa',
  beta: 'cli-beta',
  gama: 'cli-gama',
};

/**
 * Trabalho a que pertence a atividade de um cliente em um mês: o primeiro ciclo cujo
 * início é ≤ ao mês. Os trabalhos de 2026 seguem as datas de início de engagements.mock.ts;
 * antes delas, a atividade é do ciclo anterior (ou da revisão de ITR, no caso da Alfa,
 * companhia aberta). Todos os ids existem em ENGAGEMENT_CATALOG.
 */
const ENGAGEMENT_CYCLES: Record<ClientKey, readonly [fromMonth: string, engagementId: string][]> = {
  alfa: [
    ['2026-07', 'eng-alfa-2026'],
    ['2026-04', 'eng-alfa-itr-2026'],
    ['0000-00', 'eng-alfa-2025'],
  ],
  beta: [
    ['2026-09', 'eng-beta-2026'],
    ['0000-00', 'eng-beta-2025'],
  ],
  gama: [
    ['2026-04', 'eng-gama-2026'],
    ['0000-00', 'eng-gama-2025'],
  ],
};

function client(key: ClientKey): Client {
  return lookup(CLIENTS, CLIENT_ID[key], 'Cliente');
}

function engagementOf(key: ClientKey, date: string): EngagementIdentity {
  const month = date.slice(0, 7);
  const [, engagementId] = ENGAGEMENT_CYCLES[key].find(([from]) => month >= from)!;
  return lookup(ENGAGEMENT_CATALOG, engagementId, 'Trabalho');
}

/** Contexto canônico (cliente e trabalho) de uma atividade, resolvido no catálogo. */
function engagementContext(key: ClientKey, date: string): ObservationContext {
  const { id: clientId, name: clientName } = client(key);
  const engagement = engagementOf(key, date);
  return {
    clientId,
    clientName,
    engagementId: engagement.id,
    engagementName: engagementShortTitle(engagement),
  };
}

function lookup<T extends { readonly id: string }>(
  items: readonly T[],
  id: string,
  kind: string,
): T {
  const item = items.find((i) => i.id === id);
  if (!item) {
    throw new Error(`${kind} ${id} ausente do catálogo compartilhado.`);
  }
  return item;
}

function areaCode(name: string): string {
  const area = AUDIT_AREAS.find((a) => a.name === name);
  if (!area) {
    throw new Error(`Área ${name} ausente do catálogo compartilhado.`);
  }
  return area.code;
}

const REVIEWER: Record<ClientKey, string> = {
  alfa: 'Rafael Lima',
  beta: 'Rafael Lima',
  gama: 'Matheus Veras',
};

const PREPARERS: Record<ClientKey, readonly string[]> = {
  alfa: ['Matheus Veras', 'Ana Souza', 'Beatriz Nunes', 'Lucas Pereira'],
  beta: ['Ana Souza', 'Matheus Veras', 'Lucas Pereira', 'Beatriz Nunes'],
  gama: ['Ana Souza', 'Beatriz Nunes', 'Lucas Pereira'],
};

// ------------------------------------------------------------------ cartas p e u

/** Meses monitorados, na ordem das colunas das tabelas abaixo. */
const PERIODS = [
  '2025-10',
  '2025-11',
  '2025-12',
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
  '2026-07',
  '2026-08',
  '2026-09',
] as const;

/** Uma linha por segmento cliente × área; cada vetor tem um valor por mês (out/25 → set/26). */
interface SegmentRow {
  readonly client: ClientKey;
  readonly area: string;
  readonly exposure: readonly number[];
  readonly count: readonly number[];
  /** Contexto registrado para meses específicos (índice do mês → nota). */
  readonly notes?: Readonly<Record<number, string>>;
}

function periodRecords(rows: readonly SegmentRow[]): PeriodCountRecord[] {
  return rows.flatMap((row) =>
    PERIODS.map((period, i) => ({
      period,
      count: row.count[i],
      exposure: row.exposure[i],
      context: {
        ...engagementContext(row.client, `${period}-01`),
        auditArea: row.area,
        note: row.notes?.[i],
      },
    })),
  );
}

/** PTAs revisados por mês e segmento: denominador comum do retrabalho e dos pontos de revisão. */
const REVIEWED: Record<string, readonly number[]> = {
  'alfa|Receita': [7, 8, 9, 6, 7, 8, 6, 8, 8, 7, 8, 9],
  'alfa|Contas a Receber': [5, 6, 7, 5, 5, 6, 4, 6, 7, 6, 7, 8],
  'alfa|Caixa e Equivalentes': [4, 5, 5, 3, 4, 5, 3, 5, 5, 4, 5, 6],
  'beta|Receita': [5, 5, 6, 4, 5, 6, 5, 6, 6, 5, 6, 6],
  // Estoques só é revisado em torno das contagens físicas de fim de ano e de setembro.
  'beta|Estoques': [0, 3, 4, 3, 0, 0, 0, 0, 0, 0, 0, 3],
  'beta|Fornecedores': [4, 4, 5, 4, 4, 5, 4, 5, 6, 4, 5, 5],
  'gama|Receita': [6, 6, 7, 5, 6, 7, 14, 9, 9, 8, 9, 9],
  'gama|Fornecedores': [6, 6, 6, 4, 5, 7, 9, 9, 10, 8, 9, 9],
  'gama|Tributos': [5, 5, 6, 4, 5, 6, 7, 9, 9, 7, 9, 9],
};

function reviewedRows(
  counts: Record<string, readonly number[]>,
  notes: Record<string, Record<number, string>> = {},
): SegmentRow[] {
  return Object.entries(REVIEWED).map(([key, exposure]) => {
    const [client, area] = key.split('|') as [ClientKey, string];
    return { client, area, exposure, count: counts[key], notes: notes[key] };
  });
}

const REWORK = periodRecords(
  reviewedRows(
    {
      'alfa|Receita': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      'alfa|Contas a Receber': [1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1],
      'alfa|Caixa e Equivalentes': [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      'beta|Receita': [1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
      'beta|Estoques': [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      'beta|Fornecedores': [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
      'gama|Receita': [1, 1, 1, 1, 1, 1, 9, 1, 1, 1, 1, 1],
      'gama|Fornecedores': [1, 1, 1, 1, 1, 1, 4, 1, 1, 1, 1, 1],
      'gama|Tributos': [0, 0, 0, 0, 0, 1, 2, 1, 1, 1, 1, 1],
    },
    {
      'gama|Receita': {
        6: 'Início do trabalho 2026 com entrada de 4 novos assistentes na equipe; 9 dos 14 PTAs de Receita devolvidos.',
      },
    },
  ),
);

const REVIEW_NOTES = periodRecords(
  reviewedRows(
    {
      'alfa|Receita': [2, 3, 3, 2, 3, 3, 2, 3, 3, 2, 5, 3],
      'alfa|Contas a Receber': [2, 2, 3, 2, 2, 2, 1, 2, 2, 2, 15, 3],
      'alfa|Caixa e Equivalentes': [1, 1, 2, 1, 1, 2, 1, 2, 2, 1, 3, 2],
      'beta|Receita': [2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2],
      'beta|Estoques': [0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 1],
      'beta|Fornecedores': [1, 1, 1, 1, 1, 2, 1, 2, 2, 1, 2, 2],
      'gama|Receita': [3, 3, 2, 2, 2, 2, 12, 3, 3, 3, 4, 3],
      'gama|Fornecedores': [2, 2, 2, 2, 2, 2, 6, 3, 4, 3, 3, 3],
      'gama|Tributos': [2, 2, 2, 1, 2, 2, 3, 3, 3, 3, 3, 3],
    },
    {
      'alfa|Contas a Receber': {
        10: 'Primeira revisão do modelo de PECLD no trabalho 2026: 15 pontos abertos. Verificar tipo e severidade — pode refletir revisão mais aprofundada.',
      },
    },
  ),
);

const OVERDUE_REQUESTS = periodRecords([
  {
    client: 'alfa',
    area: 'Receita',
    exposure: [8, 9, 10, 7, 8, 9, 6, 8, 8, 6, 9, 9],
    count: [1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
  },
  {
    client: 'alfa',
    area: 'Contas a Receber',
    exposure: [7, 8, 8, 6, 7, 8, 5, 6, 7, 5, 8, 8],
    count: [0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
  },
  {
    client: 'alfa',
    area: 'Caixa e Equivalentes',
    exposure: [5, 5, 6, 4, 5, 6, 4, 5, 5, 4, 5, 6],
    count: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    client: 'beta',
    area: 'Receita',
    exposure: [6, 6, 7, 5, 6, 7, 6, 6, 7, 5, 6, 6],
    count: [1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0],
  },
  {
    client: 'beta',
    area: 'Estoques',
    exposure: [0, 4, 5, 4, 0, 0, 0, 0, 0, 0, 0, 4],
    count: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    client: 'beta',
    area: 'Fornecedores',
    exposure: [5, 5, 6, 5, 5, 6, 5, 5, 6, 4, 5, 5],
    count: [0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1],
  },
  {
    client: 'gama',
    area: 'Receita',
    exposure: [11, 11, 12, 10, 11, 12, 14, 14, 15, 13, 14, 15],
    count: [1, 1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
  },
  {
    client: 'gama',
    area: 'Fornecedores',
    exposure: [10, 10, 10, 9, 11, 12, 13, 13, 13, 13, 13, 15],
    count: [1, 1, 1, 1, 1, 1, 2, 3, 4, 3, 4, 5],
    notes: {
      10: 'Contratos de mútuo com partes relacionadas ainda não entregues pelo cliente.',
      11: 'Pendências de partes relacionadas acumuladas desde ago/26; tema levado à reunião de status.',
    },
  },
  {
    client: 'gama',
    area: 'Tributos',
    exposure: [8, 8, 8, 8, 9, 10, 11, 11, 11, 10, 10, 10],
    count: [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
]);

// ------------------------------------------------------------------ cartas I-MR

/** Rotação fixa de cliente × área usada para distribuir as observações individuais. */
const ROTATION: readonly [ClientKey, string][] = [
  ['gama', 'Receita'],
  ['alfa', 'Receita'],
  ['beta', 'Receita'],
  ['gama', 'Fornecedores'],
  ['alfa', 'Contas a Receber'],
  ['beta', 'Fornecedores'],
  ['gama', 'Tributos'],
  ['alfa', 'Caixa e Equivalentes'],
  ['beta', 'Receita'],
  ['gama', 'Receita'],
  ['alfa', 'Contas a Receber'],
  ['beta', 'Fornecedores'],
];

interface Assignment {
  readonly client: ClientKey;
  readonly area: string;
  readonly note?: string;
}

/** Dias úteis entre `from` e `to`, distribuídos uniformemente em `count` datas. */
function businessDates(from: string, to: string, count: number): string[] {
  const days: string[] = [];
  for (let d = new Date(`${from}T12:00:00Z`); d <= new Date(`${to}T12:00:00Z`);) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) {
      days.push(d.toISOString().slice(0, 10));
    }
    d = new Date(d.getTime() + 86_400_000);
  }
  return Array.from(
    { length: count },
    (_, i) => days[Math.round((i * (days.length - 1)) / Math.max(1, count - 1))],
  );
}

/** Atribui cliente, área, trabalho e pessoas a cada valor; `overrides` fixa os casos da demonstração. */
function assign(
  dates: readonly string[],
  overrides: Readonly<Record<number, Assignment>>,
): (Assignment & { context: ObservationContext; workpaperCode: string })[] {
  const sequence: Record<string, number> = {};
  return dates.map((date, i) => {
    const [client, area] = ROTATION[i % ROTATION.length];
    const a: Assignment = overrides[i] ?? { client, area };
    const key = `${a.client}|${a.area}`;
    sequence[key] = (sequence[key] ?? 0) + 1;
    const base = { alfa: 10, beta: 210, gama: 310 }[a.client];
    const workpaperCode = `PTA-${areaCode(a.area)}-${String(base + sequence[key]).padStart(3, '0')}`;
    const preparers = PREPARERS[a.client];
    return {
      ...a,
      workpaperCode,
      context: {
        ...engagementContext(a.client, date),
        auditArea: a.area,
        workpaperCode,
        preparer: preparers[i % preparers.length],
        reviewer: REVIEWER[a.client],
        date,
        note: a.note,
      },
    };
  });
}

/**
 * Tempo de ciclo de revisão, em dias, por PTA aprovado (mai/26 → set/26).
 * Referência da baseline: mai–jun/26 (26 PTAs).
 */
const REVIEW_CYCLE_DAYS = [
  // Referência — mai/26 e jun/26
  4.2, 3.8, 5.1, 4.6, 3.9, 4.4, 5.0, 4.1, 4.7, 4.3, 3.6, 4.9, 5.2, 4.0, 3.7, 4.5, 4.8, 4.2, 5.0,
  4.4, 3.9, 4.6, 4.1, 4.8, 4.3, 4.5,
  // Monitoramento — jul/26 a set/26
  4.6, 4.1, 4.4, 11.2, 4.3, 4.9, 3.8, 4.4, 5.0, 4.2, 4.7, 3.9, 4.5, 4.8, 4.1, 4.6, 5.1, 4.3, 3.9,
  4.6, 4.2, 4.8, 4.0, 10.4, 4.4, 4.0, 4.7, 4.5, 3.5, 6.0, 3.2, 5.9, 3.4, 4.6,
];

const REVIEW_CYCLE: IndividualObservation[] = (() => {
  const dates = [
    ...businessDates('2026-05-04', '2026-06-30', 26),
    ...businessDates('2026-07-01', '2026-09-30', 34),
  ];
  return assign(dates, {
    29: {
      client: 'gama',
      area: 'Fornecedores',
      note: 'PTA de partes relacionadas aguardou documentação de contratos de mútuo do cliente.',
    },
    49: {
      client: 'alfa',
      area: 'Receita',
      note: 'Acúmulo de revisões no fechamento do 3º tri da Empresa Alfa S.A.',
    },
    58: {
      client: 'alfa',
      area: 'Contas a Receber',
      note: 'Fila de revisão redistribuída entre revisores no fim de setembro.',
    },
  }).map((a, i) => ({
    id: a.workpaperCode,
    label: a.workpaperCode,
    date: dates[i],
    value: REVIEW_CYCLE_DAYS[i],
    context: a.context,
  }));
})();

/**
 * Tempo de resolução, em horas úteis, por review note resolvido (jul/26 → set/26).
 * Referência da baseline: jul/26 (26 pontos).
 */
const NOTE_RESOLUTION_HOURS = [
  // Referência — jul/26
  5.8, 4.9, 6.6, 5.2, 7.1, 5.5, 6.3, 4.6, 5.9, 6.8, 5.1, 6.0, 7.4, 5.6, 4.8, 6.2, 5.3, 6.9, 5.7,
  6.4, 5.0, 6.1, 5.5, 6.7, 5.2, 6.0,
  // Monitoramento — ago/26 e set/26
  5.6, 6.3, 4.9, 6.7, 5.4, 6.0, 5.2, 6.5, 5.8, 4.7, 6.2, 5.5, 6.6, 5.1, 5.9, 5.7, 5.4, 6.1, 6.9,
  7.6, 8.3, 8.9,
];

const NOTE_RESOLUTION: IndividualObservation[] = (() => {
  const dates = [
    ...businessDates('2026-07-01', '2026-07-31', 26),
    ...businessDates('2026-08-03', '2026-09-30', 22),
  ];
  const pending = 'Resposta depende de documentação de partes relacionadas solicitada ao cliente.';
  return assign(dates, {
    43: { client: 'gama', area: 'Fornecedores' },
    44: { client: 'gama', area: 'Receita' },
    45: { client: 'gama', area: 'Fornecedores', note: pending },
    46: { client: 'gama', area: 'Tributos' },
    47: { client: 'gama', area: 'Fornecedores', note: pending },
  }).map((a, i) => ({
    id: `RN-${String(101 + i)}`,
    label: `RN-${String(101 + i)}`,
    date: dates[i],
    value: NOTE_RESOLUTION_HOURS[i],
    context: { ...a.context, eventCode: `RN-${String(101 + i)}` },
  }));
})();

/**
 * Desvio de horas por atividade concluída (out/25 → set/26): [planejadas, desvio].
 * As horas realizadas derivam do desvio sobre bases de 100 h, mantendo valores inteiros.
 * Referência da baseline: out/25 – mar/26 (24 atividades).
 */
const HOURS_PLAN: readonly [number, number][] = [
  // Referência — out/25 a mar/26
  [100, 0.08],
  [200, -0.05],
  [100, 0.12],
  [300, 0.02],
  [100, -0.1],
  [200, 0.15],
  [100, 0.04],
  [200, -0.02],
  [100, 0.1],
  [300, 0.06],
  [100, -0.08],
  [200, 0.11],
  [100, 0.0],
  [200, 0.07],
  [100, -0.04],
  [300, 0.09],
  [100, 0.03],
  [200, -0.06],
  [100, 0.13],
  [200, 0.01],
  [100, 0.05],
  [300, -0.03],
  [100, 0.1],
  [200, 0.04],
  // Monitoramento — abr/26 a set/26
  [100, 0.05],
  [200, -0.12],
  [100, 0.1],
  [300, 0.03],
  [100, -0.15],
  [200, 0.08],
  [100, 0.06],
  [200, 0.62],
  [100, -0.06],
  [300, 0.12],
  [100, 0.01],
  [200, 0.09],
  [100, -0.03],
  [200, 0.14],
  [100, 0.05],
  [300, -0.08],
  [100, 0.07],
  [200, 0.02],
  [100, -0.04],
  [200, 0.1],
];

const HOURS_DEVIATION: HoursObservation[] = (() => {
  const dates = [
    ...businessDates('2025-10-06', '2026-03-31', 24),
    ...businessDates('2026-04-06', '2026-09-30', 20),
  ];
  return assign(dates, {
    31: {
      client: 'gama',
      area: 'Fornecedores',
      note: 'Escopo ampliado para partes relacionadas após identificação de contratos de mútuo não previstos no planejamento.',
    },
  }).map((a, i) => {
    const [plannedHours, deviation] = HOURS_PLAN[i];
    const { fiscalYear } = engagementOf(a.client, dates[i]);
    // Atividades são registros de horas por área, sem PTA associado na fonte.
    const {
      workpaperCode: _code,
      preparer: _preparer,
      reviewer: _reviewer,
      ...context
    } = a.context;
    return {
      id: `ATV-${String(i + 1).padStart(3, '0')}`,
      label: `${client(a.client).shortName} ${fiscalYear} · ${a.area}`,
      date: dates[i],
      plannedHours,
      actualHours: Math.round(plannedHours * (1 + deviation)),
      context,
    };
  });
})();

// ------------------------------------------------------------------ baselines

/**
 * Baselines aprovadas (firma, sem segmento). Os parâmetros foram estimados no período de
 * referência e congelados na aprovação; um teste confere a consistência com os dados.
 */
const BASELINES: readonly ControlBaseline[] = [
  {
    id: 'BL-REV-CYCLE-1',
    metricId: 'review-cycle',
    version: 1,
    status: 'monitoring',
    segment: {},
    reference: { from: '2026-01-05', to: '2026-03-31' },
    validFrom: '2026-04-01',
    validTo: '2026-06-30',
    sampleSize: 24,
    centerLine: 5.1,
    parameters: { movingRangeMean: 0.9 },
    approvedBy: 'Carlos Martins',
    approvedAt: '2026-04-02',
  },
  {
    id: 'BL-REV-CYCLE-2',
    metricId: 'review-cycle',
    version: 2,
    status: 'monitoring',
    segment: {},
    reference: { from: '2026-05-01', to: '2026-06-30' },
    validFrom: '2026-07-01',
    sampleSize: 26,
    centerLine: 4.41,
    parameters: { movingRangeMean: 0.64 },
    approvedBy: 'Carlos Martins',
    approvedAt: '2026-07-03',
  },
  {
    id: 'BL-NOTE-RES-1',
    metricId: 'note-resolution',
    version: 1,
    status: 'monitoring',
    segment: {},
    reference: { from: '2026-07-01', to: '2026-07-31' },
    validFrom: '2026-08-01',
    sampleSize: 26,
    centerLine: 5.87,
    parameters: { movingRangeMean: 1.25 },
    approvedBy: 'Helena Duarte',
    approvedAt: '2026-08-04',
  },
  {
    id: 'BL-REWORK-2',
    metricId: 'rework',
    version: 2,
    status: 'monitoring',
    segment: {},
    reference: { from: '2025-10-01', to: '2026-03-31' },
    validFrom: '2026-04-01',
    sampleSize: 6,
    centerLine: 0.1204,
    parameters: {},
    approvedBy: 'Carlos Martins',
    approvedAt: '2026-04-02',
  },
  {
    id: 'BL-NOTES-1',
    metricId: 'review-notes',
    version: 1,
    status: 'monitoring',
    segment: {},
    reference: { from: '2025-10-01', to: '2026-03-31' },
    validFrom: '2026-04-01',
    sampleSize: 6,
    centerLine: 0.3504,
    parameters: {},
    approvedBy: 'Carlos Martins',
    approvedAt: '2026-04-02',
  },
  {
    id: 'BL-OVERDUE-1',
    metricId: 'overdue-requests',
    version: 1,
    status: 'monitoring',
    segment: {},
    reference: { from: '2025-10-01', to: '2026-03-31' },
    validFrom: '2026-04-01',
    sampleSize: 6,
    centerLine: 0.0928,
    parameters: {},
    approvedBy: 'Helena Duarte',
    approvedAt: '2026-04-06',
  },
  {
    id: 'BL-HOURS-1',
    metricId: 'hours-deviation',
    version: 1,
    status: 'monitoring',
    segment: {},
    reference: { from: '2025-10-01', to: '2026-03-31' },
    validFrom: '2026-04-01',
    sampleSize: 24,
    centerLine: 0.034,
    parameters: { movingRangeMean: 0.114 },
    approvedBy: 'Carlos Martins',
    approvedAt: '2026-04-08',
  },
];

export const QUALITY_DATASET: QualityDataset = {
  reviewCycle: REVIEW_CYCLE,
  noteResolution: NOTE_RESOLUTION,
  hoursDeviation: HOURS_DEVIATION,
  rework: REWORK,
  reviewNotes: REVIEW_NOTES,
  overdueRequests: OVERDUE_REQUESTS,
  baselines: BASELINES,
  engagementsAtRisk: ['eng-gama-2026', 'eng-alfa-2026'],
};
