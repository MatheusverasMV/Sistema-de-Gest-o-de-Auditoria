/** Indicadores do MVP de Qualidade & Processos. */
export type QualityMetricId =
  | 'review-cycle'
  | 'note-resolution'
  | 'rework'
  | 'review-notes'
  | 'overdue-requests'
  | 'hours-deviation';

export type QualityDimension = 'speed' | 'quality' | 'client' | 'planning';

export type QualitySeverity = 'info' | 'attention' | 'critical';

/**
 * Ciclo de vida de uma baseline: coleta → limites experimentais → validação das
 * causas especiais → monitoramento com baseline aprovada.
 */
export type BaselineStatus = 'collecting' | 'provisional' | 'review' | 'monitoring';

/**
 * Contexto operacional de uma observação, usado em filtros e no drill-down.
 *
 * Campos canônicos (`clientId`, `engagementId`, `auditArea`, `workpaperId`, `eventId`) só
 * são preenchidos quando a ligação com a entidade é confiável; nenhum é inventado para
 * completar o contexto. Códigos registrados na fonte sem entidade correspondente ficam em
 * `workpaperCode`/`eventCode` e aparecem como "vínculo operacional não identificado".
 */
export interface ObservationContext {
  readonly clientId?: string;
  readonly clientName?: string;
  readonly engagementId?: string;
  readonly engagementName?: string;
  /** Nome da área no catálogo de áreas de auditoria. */
  readonly auditArea?: string;
  /** PTA do catálogo operacional. */
  readonly workpaperId?: string;
  /** Código de PTA informado pela fonte, sem correspondência no catálogo. */
  readonly workpaperCode?: string;
  /** Evento do histórico de eventos (AuditEvent). */
  readonly eventId?: string;
  /** Código do evento na fonte (ex.: review note "RN-143"), sem correspondência no catálogo. */
  readonly eventCode?: string;
  readonly preparer?: string;
  readonly reviewer?: string;
  /** Data do evento que encerra a observação (YYYY-MM-DD). */
  readonly date?: string;
  readonly note?: string;
}

/** Recorte da população analisada. Campo ausente = sem restrição naquela dimensão. */
export interface QualitySegment {
  readonly clientId?: string;
  readonly engagementId?: string;
  readonly auditArea?: string;
}

/**
 * Observação individual de uma carta I-MR: um PTA, um review note ou uma atividade.
 * A unidade estatística é o evento, nunca uma média do período.
 */
export interface IndividualObservation {
  readonly id: string;
  readonly label: string;
  /** Data de conclusão do evento (YYYY-MM-DD): define a ordem da série e a janela da baseline. */
  readonly date: string;
  readonly value: number;
  readonly context: ObservationContext;
}

/** Atividade de um trabalho com horas orçadas e realizadas (base do desvio de horas). */
export interface HoursObservation {
  readonly id: string;
  readonly label: string;
  readonly date: string;
  readonly plannedHours: number;
  readonly actualHours: number;
  readonly context: ObservationContext;
}

/**
 * Contagem de um período para um segmento (cliente × trabalho × área). As cartas p e u
 * agregam esses registros por período depois de aplicar os filtros.
 */
export interface PeriodCountRecord {
  /** Mês de referência (YYYY-MM). */
  readonly period: string;
  /** Itens não conformes (carta p) ou não conformidades (carta u). */
  readonly count: number;
  /** Itens inspecionados no período (denominador nᵢ). */
  readonly exposure: number;
  readonly context: ObservationContext;
}

/** Observação agregada por período para as cartas p e u. */
export interface AttributeObservation {
  readonly label: string;
  readonly count: number;
  readonly exposure: number;
}

/**
 * Baseline versionada de uma carta. Os parâmetros ficam congelados após a aprovação:
 * os limites não acompanham automaticamente os novos pontos monitorados.
 */
export interface ControlBaseline {
  readonly id: string;
  readonly metricId: QualityMetricId;
  readonly version: number;
  readonly status: BaselineStatus;
  readonly segment: QualitySegment;
  /** Janela de dados usada para estimar os parâmetros (datas YYYY-MM-DD, inclusivas). */
  readonly reference: { readonly from: string; readonly to: string };
  readonly validFrom: string;
  readonly validTo?: string;
  readonly sampleSize: number;
  /** LC: média (I), p̄ (p) ou ū (u). */
  readonly centerLine: number;
  readonly parameters: { readonly movingRangeMean?: number };
  readonly approvedBy?: string;
  readonly approvedAt?: string;
}

export interface QualityDataset {
  /** Tempo de ciclo de revisão por PTA, em dias. */
  readonly reviewCycle: readonly IndividualObservation[];
  /** Tempo de resolução por review note, em horas úteis. */
  readonly noteResolution: readonly IndividualObservation[];
  readonly hoursDeviation: readonly HoursObservation[];
  /** count = PTAs devolvidos · exposure = PTAs revisados. */
  readonly rework: readonly PeriodCountRecord[];
  /** count = review notes abertos · exposure = PTAs revisados. */
  readonly reviewNotes: readonly PeriodCountRecord[];
  /** count = solicitações não atendidas até o vencimento · exposure = solicitações vencendo no período. */
  readonly overdueRequests: readonly PeriodCountRecord[];
  readonly baselines: readonly ControlBaseline[];
  readonly engagementsAtRisk: readonly string[];
}

/** Linha "rótulo: valor" exibida no tooltip e no drill-down de um ponto. */
export interface PointFact {
  readonly label: string;
  readonly value: string;
}

/** Ponto já calculado e pronto para renderização em uma carta de controle. */
export interface ControlChartPoint {
  readonly id: string;
  readonly label: string;
  /** Rótulo curto do eixo X; string vazia oculta o rótulo deste ponto. */
  readonly axisLabel?: string;
  readonly value: number;
  readonly ucl: number;
  readonly lcl: number;
  readonly outOfControl: boolean;
  /** Ponto usado na estimativa da baseline ou monitorado contra ela. */
  readonly phase?: 'reference' | 'monitoring';
  /** Severidade do sinal mais grave que envolve o ponto. */
  readonly flag?: QualitySeverity;
  readonly detail?: string;
  readonly facts?: readonly PointFact[];
  readonly context?: ObservationContext;
}

export interface ControlChartData {
  readonly points: readonly ControlChartPoint[];
  readonly center: number;
}

export type QualitySignalRule = 'beyond-limits' | 'trend' | 'variability';

/** Anomalia estatística que merece investigação. Não é uma conclusão sobre a causa. */
export interface QualitySignal {
  readonly id: string;
  readonly metricId: QualityMetricId;
  readonly severity: QualitySeverity;
  readonly rule: QualitySignalRule;
  readonly title: string;
  readonly message: string;
  /** Carta em que o sinal foi detectado. */
  readonly chart: 'primary' | 'moving-range';
  /** Ponto que ancora o sinal (o mais recente envolvido). */
  readonly pointId: string;
  readonly pointIds: readonly string[];
  readonly pointLabel: string;
  /** Data usada para ordenar sinais por recência (YYYY-MM-DD). */
  readonly date: string;
  readonly context?: ObservationContext;
}

export interface QualityMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly icon: string;
  readonly tone: 'neutral' | 'warning' | 'danger';
}
