import { Workpaper, WorkpaperStatus } from '../models';

interface WorkpaperSeed {
  id: string;
  engagementId: string;
  area: string;
  title: string;
  preparerId: string;
  reviewerId: string;
  status: WorkpaperStatus;
  date: string;
  updatedAt: string;
}

/** Conteúdo padrão para PTAs secundários; o PTA-REC-001 é detalhado individualmente. */
function standardWorkpaper(seed: WorkpaperSeed): Workpaper {
  const finalized = seed.status === 'finalized';
  const started = seed.status !== 'not_started';
  return {
    ...seed,
    objective: `Obter evidência de auditoria apropriada e suficiente sobre a existência, integridade e valorização dos saldos de ${seed.area}.`,
    basis: [`Razão analítico de ${seed.area}`, 'Balancete de verificação de 30/09/2026'],
    procedures: [
      {
        id: 'P1',
        description: 'Conciliar saldo do razão com o balancete e com os relatórios auxiliares.',
        done: started,
      },
      {
        id: 'P2',
        description: 'Realizar revisão analítica com base em expectativas independentes.',
        done: finalized,
      },
      {
        id: 'P3',
        description: 'Executar testes de detalhe sobre itens selecionados.',
        done: finalized,
      },
    ],
    results: finalized
      ? 'Procedimentos executados sem exceções relevantes. Diferenças identificadas abaixo do limite de trivialidade.'
      : 'Procedimentos em andamento.',
    exceptions: [],
    evidences: started
      ? [
          {
            id: `${seed.id}-EV1`,
            name: `Razão ${seed.area} — set-2026.xlsx`,
            kind: 'file',
            addedById: seed.preparerId,
            addedAt: seed.date,
          },
        ]
      : [],
    conclusion: finalized
      ? `Com base nos procedimentos executados, os saldos de ${seed.area} estão adequadamente apresentados em todos os aspectos relevantes.`
      : '',
    reviewNotes: [],
  };
}

const REVENUE_WORKPAPER: Workpaper = {
  id: 'PTA-REC-001',
  engagementId: 'eng-alfa-2026',
  area: 'Receita',
  title: 'Teste de Receita',
  preparerId: 'u-ana',
  reviewerId: 'u-rafael',
  status: 'in_preparation',
  date: '2026-09-15',
  updatedAt: '2026-10-05T17:40:00-03:00',
  objective:
    'Verificar a ocorrência, integridade e o corte da receita de vendas de produtos reconhecida entre 01/01 e 30/09/2026, endereçando o risco significativo R-01.',
  basis: [
    'Razão analítico da conta 3.1.01 — Receita de vendas (jan–set/2026)',
    'Relatório auxiliar de faturamento (ERP) — 12.489 notas fiscais',
    'Balancete de verificação de 30/09/2026',
    'Contratos com clientes relevantes (Rede Delta, Grupo Ômega)',
  ],
  procedures: [
    {
      id: 'P1',
      description:
        'Conciliar o razão de receita com o relatório auxiliar de faturamento e com o balancete.',
      done: true,
    },
    {
      id: 'P2',
      description:
        'Revisão analítica mensal por linha de produto, comparando com 2025 e com o orçamento.',
      done: true,
    },
    {
      id: 'P3',
      description:
        'Selecionar amostra de lançamentos de receita por unidade monetária, com itens acima da materialidade de execução.',
      done: false,
      automationId: 'sample-selection',
    },
    {
      id: 'P4',
      description:
        'Confrontar os itens selecionados com nota fiscal, pedido e comprovante de entrega.',
      done: false,
    },
    {
      id: 'P5',
      description: 'Teste de corte: notas emitidas 10 dias antes e depois de 30/09/2026.',
      done: false,
    },
  ],
  results:
    'Conciliação sem diferenças. Revisão analítica: receita 12,4% acima de 2025, explicada pelo reajuste de tabela (jun/26) e pelo novo contrato com a Rede Delta. Testes de detalhe dependem da seleção de amostras.',
  exceptions: [
    {
      id: 'EX-01',
      description:
        'NF 88.412 reconhecida em setembro com entrega ocorrida em outubro (falha de corte).',
      amount: 186_400,
      severity: 'high',
      resolved: false,
    },
    {
      id: 'EX-02',
      description: 'Divergência de alíquota de ICMS em 3 notas fiscais — corrigida pelo cliente.',
      amount: 4_120,
      severity: 'low',
      resolved: true,
    },
  ],
  evidences: [
    {
      id: 'EV-01',
      name: 'Razão 3.1.01 — jan-set 2026.xlsx',
      kind: 'file',
      addedById: 'u-ana',
      addedAt: '2026-09-15T10:12:00-03:00',
    },
    {
      id: 'EV-02',
      name: 'Conciliação razão × faturamento.xlsx',
      kind: 'file',
      addedById: 'u-ana',
      addedAt: '2026-09-22T16:05:00-03:00',
    },
    {
      id: 'EV-03',
      name: 'Revisão analítica mensal.pdf',
      kind: 'file',
      addedById: 'u-matheus',
      addedAt: '2026-09-30T11:48:00-03:00',
    },
  ],
  conclusion: '',
  reviewNotes: [
    {
      id: 'RN-01',
      authorId: 'u-rafael',
      date: '2026-09-29T09:20:00-03:00',
      text: 'Documentar o critério de seleção da amostra e vincular o resultado ao PTA antes de enviar para revisão.',
      resolved: false,
    },
    {
      id: 'RN-02',
      authorId: 'u-rafael',
      date: '2026-09-23T14:02:00-03:00',
      text: 'Incluir referência cruzada da conciliação com o balancete.',
      resolved: true,
    },
  ],
};

export const WORKPAPERS: readonly Workpaper[] = [
  standardWorkpaper({
    id: 'PTA-CXA-001',
    engagementId: 'eng-alfa-2026',
    area: 'Caixa e Equivalentes',
    title: 'Confirmação de saldos bancários',
    preparerId: 'u-matheus',
    reviewerId: 'u-rafael',
    status: 'finalized',
    date: '2026-09-02',
    updatedAt: '2026-09-26T10:30:00-03:00',
  }),
  standardWorkpaper({
    id: 'PTA-CR-001',
    engagementId: 'eng-alfa-2026',
    area: 'Contas a Receber',
    title: 'Circularização e PECLD',
    preparerId: 'u-matheus',
    reviewerId: 'u-rafael',
    status: 'in_review',
    date: '2026-09-08',
    updatedAt: '2026-10-03T15:12:00-03:00',
  }),
  REVENUE_WORKPAPER,
  standardWorkpaper({
    id: 'PTA-FOR-001',
    engagementId: 'eng-alfa-2026',
    area: 'Fornecedores',
    title: 'Passivos não registrados',
    preparerId: 'u-beatriz',
    reviewerId: 'u-rafael',
    status: 'awaiting_review',
    date: '2026-09-18',
    updatedAt: '2026-10-02T09:44:00-03:00',
  }),
  standardWorkpaper({
    id: 'PTA-FOL-001',
    engagementId: 'eng-alfa-2026',
    area: 'Folha',
    title: 'Folha de pagamento e encargos',
    preparerId: 'u-ana',
    reviewerId: 'u-rafael',
    status: 'in_preparation',
    date: '2026-09-21',
    updatedAt: '2026-10-05T11:20:00-03:00',
  }),
  standardWorkpaper({
    id: 'PTA-IMO-001',
    engagementId: 'eng-alfa-2026',
    area: 'Imobilizado',
    title: 'Adições e depreciação',
    preparerId: 'u-lucas',
    reviewerId: 'u-matheus',
    status: 'finalized',
    date: '2026-08-28',
    updatedAt: '2026-09-19T17:05:00-03:00',
  }),
  standardWorkpaper({
    id: 'PTA-EST-201',
    engagementId: 'eng-beta-2026',
    area: 'Estoques',
    title: 'Acompanhamento de inventário',
    preparerId: 'u-matheus',
    reviewerId: 'u-rafael',
    status: 'not_started',
    date: '2026-10-01',
    updatedAt: '2026-10-01T09:00:00-03:00',
  }),
  standardWorkpaper({
    id: 'PTA-REC-201',
    engagementId: 'eng-beta-2026',
    area: 'Receita',
    title: 'Teste de Receita',
    preparerId: 'u-ana',
    reviewerId: 'u-rafael',
    status: 'in_preparation',
    date: '2026-09-28',
    updatedAt: '2026-10-04T16:10:00-03:00',
  }),
  standardWorkpaper({
    id: 'PTA-FOR-301',
    engagementId: 'eng-gama-2026',
    area: 'Fornecedores',
    title: 'Partes relacionadas',
    preparerId: 'u-matheus',
    reviewerId: 'u-carlos',
    status: 'with_issues',
    date: '2026-08-10',
    updatedAt: '2026-10-01T18:22:00-03:00',
  }),
  standardWorkpaper({
    id: 'PTA-TRB-301',
    engagementId: 'eng-gama-2026',
    area: 'Tributos',
    title: 'Tributos sobre o lucro',
    preparerId: 'u-rafael',
    reviewerId: 'u-carlos',
    status: 'awaiting_review',
    date: '2026-08-20',
    updatedAt: '2026-09-30T13:00:00-03:00',
  }),
  standardWorkpaper({
    id: 'PTA-CXA-301',
    engagementId: 'eng-gama-2026',
    area: 'Caixa e Equivalentes',
    title: 'Confirmação de saldos bancários',
    preparerId: 'u-beatriz',
    reviewerId: 'u-matheus',
    status: 'finalized',
    date: '2026-07-14',
    updatedAt: '2026-08-30T10:00:00-03:00',
  }),
];
