import { Automation, AutomationExecution, SampleItem } from '../models';

export const AUTOMATIONS: readonly Automation[] = [
  {
    id: 'sample-selection',
    name: 'Seleção de Amostras',
    description:
      'Seleciona itens de uma população por unidade monetária, aleatória ou estratificada, destacando itens acima da materialidade.',
    category: 'Amostragem',
    icon: 'shuffle',
    inputs: 'XLS, XLSX ou CSV',
    estimatedTime: '~1 min',
    available: true,
  },
  {
    id: 'ledger-vs-subledger',
    name: 'Razão × Relatório Auxiliar',
    description:
      'Concilia o razão contábil com relatórios auxiliares do ERP e aponta divergências por documento.',
    category: 'Conciliação',
    icon: 'git-compare',
    inputs: 'Dois arquivos XLSX/CSV',
    estimatedTime: '~2 min',
    available: false,
  },
  {
    id: 'duplicate-detection',
    name: 'Detecção de Duplicidades',
    description:
      'Identifica lançamentos com mesmo valor, data, documento ou fornecedor, incluindo correspondências aproximadas.',
    category: 'Dados',
    icon: 'copy',
    inputs: 'XLSX ou CSV',
    estimatedTime: '~1 min',
    available: false,
  },
  {
    id: 'payroll-vs-ledger',
    name: 'Folha × Razão',
    description:
      'Confronta os resumos da folha de pagamento com as contas de salários e encargos no razão.',
    category: 'Folha',
    icon: 'users',
    inputs: 'Resumo da folha + razão',
    estimatedTime: '~2 min',
    available: false,
  },
  {
    id: 'revenue-analysis',
    name: 'Análise de Receita',
    description:
      'Revisão analítica de receita por mês, cliente e produto, com variações frente ao período anterior.',
    category: 'Receita',
    icon: 'trending-up',
    inputs: 'Relatório de faturamento',
    estimatedTime: '~3 min',
    available: false,
  },
  {
    id: 'pdf-extraction',
    name: 'Extração Estruturada de PDF',
    description:
      'Converte extratos, notas e contratos em PDF para tabelas estruturadas prontas para conferência.',
    category: 'Documentos',
    icon: 'scan-text',
    inputs: 'Arquivos PDF',
    estimatedTime: '~4 min',
    available: false,
  },
];

export const AUTOMATION_EXECUTIONS: readonly AutomationExecution[] = [
  {
    id: 'EXE-0198',
    automationId: 'duplicate-detection',
    engagementId: 'eng-alfa-2026',
    executedById: 'u-matheus',
    executedAt: '2026-10-05T16:20:00-03:00',
    status: 'success',
    summary: '37 possíveis duplicidades em 12.489 lançamentos',
  },
  {
    id: 'EXE-0197',
    automationId: 'payroll-vs-ledger',
    engagementId: 'eng-alfa-2026',
    workpaperId: 'PTA-FOL-001',
    executedById: 'u-ana',
    executedAt: '2026-10-04T10:05:00-03:00',
    status: 'success',
    summary: 'Diferença de R$ 2.310 em encargos (INSS)',
  },
  {
    id: 'EXE-0196',
    automationId: 'pdf-extraction',
    engagementId: 'eng-gama-2026',
    executedById: 'u-beatriz',
    executedAt: '2026-10-02T14:41:00-03:00',
    status: 'failed',
    summary: '2 arquivos protegidos por senha',
  },
  {
    id: 'EXE-0195',
    automationId: 'ledger-vs-subledger',
    engagementId: 'eng-alfa-2026',
    workpaperId: 'PTA-CR-001',
    executedById: 'u-matheus',
    executedAt: '2026-10-01T09:30:00-03:00',
    status: 'success',
    summary: 'Conciliado sem divergências (4.812 títulos)',
  },
];

/** População fixa do arquivo de demonstração (razão de receita da Empresa Alfa). */
export const SAMPLE_POPULATION = { count: 12_489, value: 18_245_320 } as const;

const CUSTOMERS = [
  'Rede Delta Supermercados',
  'Grupo Ômega Varejo',
  'Comercial Sigma',
  'Distribuidora Kappa',
  'Atacadista Lambda',
  'Mercantil Épsilon',
];

const AMOUNTS = [
  1_284_600, 912_350, 786_400, 655_120, 598_740, 541_300, 487_950, 452_800, 401_260, 366_480,
  214_560, 186_400, 162_980, 148_300, 131_750, 120_440, 109_860, 98_120, 91_300, 84_770, 76_540,
  68_210, 59_880, 41_650, 32_520,
];

/** Itens retornados pela seleção simulada; soma = R$ 8.114.280. */
export function buildSampleItems(materiality: number): SampleItem[] {
  return AMOUNTS.map((amount, index) => {
    const month = ((index * 5) % 9) + 1;
    const day = ((index * 7) % 27) + 1;
    return {
      document:
        amount === 186_400 ? 'NF 88.412' : `NF ${(81_204 + index * 263).toLocaleString('pt-BR')}`,
      date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      account: '3.1.01 Receita de vendas',
      description: `Venda de produtos — ${CUSTOMERS[index % CUSTOMERS.length]}`,
      amount,
      reason: amount >= materiality ? 'Acima da materialidade' : 'Seleção estatística',
    };
  });
}
