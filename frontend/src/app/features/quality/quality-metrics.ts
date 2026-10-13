import { QualityDimension, QualityMetricId } from '../../core/models';
import { MetricPolarity } from './control-signals';
import {
  formatBusinessHours,
  formatDays,
  formatDaysShort,
  formatHoursShort,
  formatPer100,
  formatPer100Short,
  formatPercent,
  formatSignedPercent,
} from './quality-format';

export type ChartMethod = 'I-MR' | 'p' | 'u';

/**
 * Metadados de um indicador: o que o Sócio lê primeiro (pergunta e título gerencial)
 * e o que fica em segundo plano (método estatístico, fórmula).
 */
export interface QualityMetricDefinition {
  readonly id: QualityMetricId;
  readonly dimension: QualityDimension;
  readonly title: string;
  /** Pergunta gerencial respondida pela carta. */
  readonly question: string;
  /** Como o indicador é medido, em linguagem operacional. */
  readonly definition: string;
  readonly method: ChartMethod;
  readonly methodLabel: string;
  readonly methodNote: string;
  readonly polarity: MetricPolarity;
  /** Sujeito das mensagens geradas ("o tempo de ciclo de revisão"). */
  readonly subject: string;
  /** Complemento que situa uma observação na frase ("do PTA-FOR-302", "em abr/26"). */
  readonly describePoint: (label: string) => string;
  /** Unidade das observações, no plural ("PTAs concluídos", "meses"). */
  readonly observationNoun: string;
  /** Formato curto para eixo e rótulos de limite. */
  readonly format: (value: number) => string;
  /** Formato longo para tooltip, KPIs e drill-down. */
  readonly formatLong: (value: number) => string;
  /** Limite natural inferior (tempos e taxas não são negativos). */
  readonly lowerBound?: number;
  /** Prefixo do rótulo de cada ponto no tooltip ("Mês abr/26"). */
  readonly pointPrefix: string;
  readonly chartLabel: string;
  /** Pontos de partida para a investigação. Hipóteses, não causas comprovadas. */
  readonly investigation: readonly string[];
}

export const QUALITY_DIMENSIONS: readonly {
  readonly id: QualityDimension;
  readonly label: string;
  readonly question: string;
}[] = [
  { id: 'speed', label: 'Velocidade', question: 'Os trabalhos estão fluindo normalmente?' },
  {
    id: 'quality',
    label: 'Qualidade',
    question: 'Estamos produzindo PTAs adequados sem retrabalho excessivo?',
  },
  {
    id: 'client',
    label: 'Cliente',
    question: 'O cliente está criando gargalos na obtenção de evidências?',
  },
  {
    id: 'planning',
    label: 'Planejamento',
    question: 'Os trabalhos estão consumindo recursos conforme o esperado?',
  },
];

const IMR_NOTE =
  'Cada ponto é uma observação individual. LC = média do período de referência · LSC/LIC = LC ± 2,66 × amplitude móvel média (MR̄). Carta MR: LSC = 3,267 × MR̄.';

export const QUALITY_METRICS: readonly QualityMetricDefinition[] = [
  {
    id: 'review-cycle',
    dimension: 'speed',
    title: 'Tempo de ciclo de revisão',
    question: 'A revisão dos PTAs está mais lenta ou mais irregular que o habitual?',
    definition: 'Dias entre o envio do PTA para revisão e a aprovação final, por PTA concluído',
    method: 'I-MR',
    methodLabel: 'Carta I-MR',
    methodNote: IMR_NOTE,
    polarity: 'higher-is-worse',
    subject: 'o tempo de ciclo de revisão',
    describePoint: (label) => `do ${label}`,
    observationNoun: 'PTAs concluídos',
    format: formatDaysShort,
    formatLong: formatDays,
    lowerBound: 0,
    pointPrefix: '',
    chartLabel: 'Carta de indivíduos do tempo de ciclo de revisão, em dias, por PTA concluído',
    investigation: [
      'Verificar se o PTA aguardou evidência do cliente ou ficou parado na fila de revisão.',
      'Comparar a carga de revisões abertas no período com a capacidade da equipe.',
      'Avaliar se a complexidade da área justifica uma baseline própria.',
    ],
  },
  {
    id: 'note-resolution',
    dimension: 'speed',
    title: 'Tempo de resolução de pontos de revisão',
    question: 'O fluxo de resolução das pendências está ficando mais lento ou instável?',
    definition: 'Horas úteis entre a abertura e a resolução de cada review note',
    method: 'I-MR',
    methodLabel: 'Carta I-MR',
    methodNote: IMR_NOTE,
    polarity: 'higher-is-worse',
    subject: 'o tempo de resolução dos pontos de revisão',
    describePoint: (label) => `do ponto ${label}`,
    observationNoun: 'review notes resolvidos',
    format: formatHoursShort,
    formatLong: formatBusinessHours,
    lowerBound: 0,
    pointPrefix: '',
    chartLabel: 'Carta de indivíduos do tempo de resolução de review notes, em horas úteis',
    investigation: [
      'Identificar se os pontos dependem de resposta do cliente ou de retrabalho interno.',
      'Verificar a disponibilidade de preparadores e revisores no período.',
      'Avaliar se pontos abertos podem comprometer o fechamento do trabalho.',
    ],
  },
  {
    id: 'rework',
    dimension: 'quality',
    title: 'Taxa de retrabalho',
    question: 'A proporção de PTAs devolvidos ao preparador saiu do padrão histórico?',
    definition: 'PTAs devolvidos ao preparador ÷ PTAs revisados no mês',
    method: 'p',
    methodLabel: 'Carta p',
    methodNote:
      'LC = p̄ agregado do período de referência (Σ devolvidos ÷ Σ revisados) · LSC/LIC = p̄ ± 3·√(p̄(1−p̄)/n), variando com o número de PTAs revisados no mês.',
    polarity: 'higher-is-worse',
    subject: 'a taxa de retrabalho',
    describePoint: (label) => `em ${label}`,
    observationNoun: 'meses',
    format: formatPercent,
    formatLong: formatPercent,
    lowerBound: 0,
    pointPrefix: 'Mês',
    chartLabel: 'Carta p da taxa de retrabalho de PTAs, em percentual, por mês',
    investigation: [
      'Investigar a concentração das devoluções por cliente, área e tipo de PTA.',
      'Revisar a classificação dos review notes que motivaram as devoluções.',
      'Verificar mudanças de equipe, de escopo ou de critério de revisão no período.',
    ],
  },
  {
    id: 'review-notes',
    dimension: 'quality',
    title: 'Pontos de revisão por 100 PTAs',
    question: 'A densidade de problemas encontrados na revisão mudou?',
    definition: 'Review notes abertos para cada 100 PTAs revisados no mês',
    method: 'u',
    methodLabel: 'Carta u',
    methodNote:
      'LC = ū agregado do período de referência (Σ review notes ÷ Σ PTAs revisados) · LSC/LIC = ū ± 3·√(ū/n). Exibido por 100 PTAs.',
    polarity: 'higher-is-worse',
    subject: 'a densidade de pontos de revisão',
    describePoint: (label) => `em ${label}`,
    observationNoun: 'meses',
    format: formatPer100Short,
    formatLong: formatPer100,
    lowerBound: 0,
    pointPrefix: 'Mês',
    chartLabel: 'Carta u de pontos de revisão por 100 PTAs revisados, por mês',
    investigation: [
      'Analisar tipo e severidade dos pontos: mais pontos também podem indicar revisão mais profunda.',
      'Verificar a concentração por área e ciclo contábil.',
      'Avaliar onboarding de equipe nova ou mudança na complexidade dos clientes.',
    ],
  },
  {
    id: 'overdue-requests',
    dimension: 'client',
    title: 'Solicitações documentais vencidas',
    question: 'O cliente está se tornando um gargalo sistemático na obtenção de evidências?',
    definition: 'Solicitações não atendidas até o vencimento ÷ solicitações vencendo no mês',
    method: 'p',
    methodLabel: 'Carta p',
    methodNote:
      'LC = p̄ agregado do período de referência · LSC/LIC = p̄ ± 3·√(p̄(1−p̄)/n), com n = solicitações com vencimento no mês.',
    polarity: 'higher-is-worse',
    subject: 'a proporção de solicitações vencidas',
    describePoint: (label) => `em ${label}`,
    observationNoun: 'meses',
    format: formatPercent,
    formatLong: formatPercent,
    lowerBound: 0,
    pointPrefix: 'Mês',
    chartLabel: 'Carta p de solicitações documentais vencidas, em percentual, por mês',
    investigation: [
      'Identificar as áreas documentais e os responsáveis do cliente com mais pendências.',
      'Distinguir atraso do cliente de atraso interno na formalização das solicitações.',
      'Avaliar a pauta da próxima reunião de status com a administração do cliente.',
    ],
  },
  {
    id: 'hours-deviation',
    dimension: 'planning',
    title: 'Desvio de horas realizadas vs. planejadas',
    question: 'Os trabalhos estão consumindo horas conforme o orçamento?',
    definition: '(Horas realizadas − planejadas) ÷ planejadas, por atividade concluída',
    method: 'I-MR',
    methodLabel: 'Carta I-MR',
    methodNote: `${IMR_NOTE} Valores negativos indicam consumo abaixo do orçamento.`,
    polarity: 'higher-is-worse',
    subject: 'o desvio de horas',
    describePoint: (label) => `em ${label}`,
    observationNoun: 'atividades concluídas',
    format: formatSignedPercent,
    formatLong: formatSignedPercent,
    pointPrefix: '',
    chartLabel: 'Carta de indivíduos do desvio percentual de horas por atividade concluída',
    investigation: [
      'Verificar mudança de escopo ou complexidade superior à prevista no planejamento.',
      'Comparar o orçamento da atividade com trabalhos semelhantes.',
      'Avaliar a necessidade de revisar a estimativa das próximas fases.',
    ],
  },
];

export function metricDefinition(id: QualityMetricId): QualityMetricDefinition {
  return QUALITY_METRICS.find((m) => m.id === id)!;
}

/**
 * Volume mínimo no período de referência para estimar limites de um segmento
 * (observações individuais para I-MR; meses com exposição para p/u).
 * Critério do protótipo, a validar com a área técnica: fica abaixo das ~25 observações
 * usuais para baselines definitivas, por isso limites de segmento são sempre provisórios.
 */
export const MIN_REFERENCE: Record<ChartMethod, number> = {
  'I-MR': 8,
  p: 6,
  u: 6,
};
