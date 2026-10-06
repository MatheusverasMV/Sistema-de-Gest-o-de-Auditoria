/** Observação de uma carta de indivíduos (ex.: tempo de ciclo de revisão em dias). */
export interface IndividualObservation {
  readonly period: string;
  readonly value: number;
  readonly note?: string;
}

/** Observação de uma carta p: itens não conformes sobre o total inspecionado no período. */
export interface ProportionObservation {
  readonly period: string;
  readonly defective: number;
  readonly inspected: number;
  readonly note?: string;
}

export interface QualityDataset {
  readonly reviewCycleTime: readonly IndividualObservation[];
  readonly reworkRate: readonly ProportionObservation[];
  readonly engagementsAtRisk: readonly string[];
}

/** Ponto já calculado e pronto para renderização em uma carta de controle. */
export interface ControlChartPoint {
  readonly label: string;
  readonly value: number;
  readonly ucl: number;
  readonly lcl: number;
  readonly outOfControl: boolean;
  readonly detail?: string;
}

export interface ControlChartData {
  readonly points: readonly ControlChartPoint[];
  readonly center: number;
}

export interface QualityMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly icon: string;
  readonly tone: 'neutral' | 'warning' | 'danger';
}
