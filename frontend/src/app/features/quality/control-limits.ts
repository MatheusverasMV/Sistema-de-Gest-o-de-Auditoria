import { AttributeObservation, ControlChartData, ControlChartPoint } from '../../core/models';

/**
 * Cálculos de limites de controle (Shewhart). Mantidos separados da renderização
 * para serem testáveis e, no futuro, substituíveis por cálculo no backend.
 *
 * Cada carta tem duas etapas: estimar a baseline (a partir do período de referência)
 * e aplicar a baseline a toda a série monitorada. Assim os limites não acompanham
 * automaticamente cada novo ponto.
 */

/** 3 / d₂, com d₂ = 1,128 para amplitude móvel de 2 observações. */
export const MR_FACTOR = 2.66;
/** D₄ para amplitude móvel de 2 observações: LSC da carta MR = 3,267 · MR̄. */
export const MR_UCL_FACTOR = 3.267;

/** Entrada mínima de uma série de indivíduos. */
export interface SeriesValue {
  readonly label: string;
  readonly value: number;
  readonly id?: string;
}

export interface IndividualsBaseline {
  /** LC = X̄ do período de referência. */
  readonly center: number;
  /** MR̄ do período de referência. */
  readonly movingRangeMean: number;
}

export interface IndividualsChartOptions {
  /**
   * Limite inferior natural da métrica (ex.: 0 para tempos). Sem ele, o LIC
   * pode ser negativo, como no desvio de horas.
   */
  readonly lowerBound?: number;
}

/** MRᵢ = |Xᵢ − Xᵢ₋₁|, para i ≥ 2. */
export function movingRanges(values: readonly number[]): number[] {
  return values.slice(1).map((v, i) => Math.abs(v - values[i]));
}

export function estimateIndividualsBaseline(values: readonly number[]): IndividualsBaseline {
  return { center: mean(values), movingRangeMean: mean(movingRanges(values)) };
}

/** Carta de indivíduos (I): LC = X̄; LSC/LIC = X̄ ± 2,66 · MR̄. */
export function individualsChart(
  series: readonly SeriesValue[],
  baseline: IndividualsBaseline = estimateIndividualsBaseline(series.map((s) => s.value)),
  options: IndividualsChartOptions = {},
): ControlChartData {
  const { center, movingRangeMean } = baseline;
  const ucl = center + MR_FACTOR * movingRangeMean;
  const rawLcl = center - MR_FACTOR * movingRangeMean;
  const lcl = options.lowerBound === undefined ? rawLcl : Math.max(options.lowerBound, rawLcl);
  return {
    center,
    points: series.map((s) => point(s.id ?? s.label, s.label, s.value, ucl, lcl)),
  };
}

/**
 * Carta de amplitude móvel (MR): LC = MR̄; LSC = 3,267 · MR̄; LIC = 0.
 * O primeiro indivíduo não tem amplitude móvel; o ponto i carrega o id da observação i.
 */
export function movingRangeChart(
  series: readonly SeriesValue[],
  baseline: IndividualsBaseline = estimateIndividualsBaseline(series.map((s) => s.value)),
): ControlChartData {
  const center = baseline.movingRangeMean;
  const ucl = MR_UCL_FACTOR * center;
  const ranges = movingRanges(series.map((s) => s.value));
  return {
    center,
    points: ranges.map((mr, i) => {
      const s = series[i + 1];
      return point(s.id ?? s.label, s.label, mr, ucl, 0);
    }),
  };
}

export interface IndividualsMovingRangeChart {
  readonly individuals: ControlChartData;
  readonly movingRange: ControlChartData;
}

/** Par I-MR com a mesma baseline: nível do processo + variabilidade entre observações consecutivas. */
export function individualsMovingRangeChart(
  series: readonly SeriesValue[],
  baseline: IndividualsBaseline = estimateIndividualsBaseline(series.map((s) => s.value)),
  options: IndividualsChartOptions = {},
): IndividualsMovingRangeChart {
  return {
    individuals: individualsChart(series, baseline, options),
    movingRange: movingRangeChart(series, baseline),
  };
}

/** p̄ agregado = Σ não conformes / Σ inspecionados (não a média das proporções). */
export function estimateProportionCenter(observations: readonly AttributeObservation[]): number {
  return pooledRate(observations);
}

/** Carta p: LSC/LIC = p̄ ± 3·√(p̄(1−p̄)/nᵢ), variando com o tamanho de cada período; LIC ≥ 0. */
export function proportionChart(
  observations: readonly AttributeObservation[],
  pBar: number = estimateProportionCenter(observations),
): ControlChartData {
  return {
    center: pBar,
    points: observations.map((o) => {
      const p = o.exposure ? o.count / o.exposure : 0;
      const sigma = o.exposure ? Math.sqrt((pBar * (1 - pBar)) / o.exposure) : 0;
      return point(
        o.label,
        o.label,
        p,
        Math.min(1, pBar + 3 * sigma),
        Math.max(0, pBar - 3 * sigma),
      );
    }),
  };
}

/** ū agregado = Σ não conformidades / Σ unidades inspecionadas. */
export function estimateRateCenter(observations: readonly AttributeObservation[]): number {
  return pooledRate(observations);
}

/**
 * Carta u (não conformidades por unidade, com exposição variável):
 * LSC/LIC = ū ± 3·√(ū/nᵢ); LIC ≥ 0. Valores em unidades por item (ex.: notes por PTA).
 */
export function uChart(
  observations: readonly AttributeObservation[],
  uBar: number = estimateRateCenter(observations),
): ControlChartData {
  return {
    center: uBar,
    points: observations.map((o) => {
      const u = o.exposure ? o.count / o.exposure : 0;
      const sigma = o.exposure ? Math.sqrt(uBar / o.exposure) : 0;
      return point(o.label, o.label, u, uBar + 3 * sigma, Math.max(0, uBar - 3 * sigma));
    }),
  };
}

/** D = (realizadas − planejadas) / planejadas. 0,25 = 25% acima do orçamento; −0,12 = 12% abaixo. */
export function hoursDeviation(plannedHours: number, actualHours: number): number {
  return plannedHours ? (actualHours - plannedHours) / plannedHours : 0;
}

export function mean(values: readonly number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

function pooledRate(observations: readonly AttributeObservation[]): number {
  const count = observations.reduce((sum, o) => sum + o.count, 0);
  const exposure = observations.reduce((sum, o) => sum + o.exposure, 0);
  return exposure ? count / exposure : 0;
}

function point(
  id: string,
  label: string,
  value: number,
  ucl: number,
  lcl: number,
): ControlChartPoint {
  return { id, label, value, ucl, lcl, outOfControl: value > ucl || value < lcl };
}
