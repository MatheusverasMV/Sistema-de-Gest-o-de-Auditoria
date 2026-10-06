import { ControlChartData, IndividualObservation, ProportionObservation } from '../../core/models';

/**
 * Cálculos de limites de controle (Shewhart). Mantidos separados da renderização
 * para serem testáveis e, no futuro, substituíveis por cálculo no backend.
 */

/** Constante d2 para amplitude móvel de 2 observações: 3 / 1,128 ≈ 2,66. */
const MR_FACTOR = 2.66;

/** Carta de indivíduos (I-MR): LC = média; LSC/LIC = média ± 2,66 · MR̄. */
export function individualsChart(observations: readonly IndividualObservation[]): ControlChartData {
  const values = observations.map((o) => o.value);
  const center = mean(values);
  const movingRanges = values.slice(1).map((v, i) => Math.abs(v - values[i]));
  const mrBar = mean(movingRanges);
  const ucl = center + MR_FACTOR * mrBar;
  const lcl = Math.max(0, center - MR_FACTOR * mrBar);
  return {
    center,
    points: observations.map((o) => ({
      label: o.period,
      value: o.value,
      ucl,
      lcl,
      outOfControl: o.value > ucl || o.value < lcl,
      detail: o.note,
    })),
  };
}

/** Carta p: LC = p̄ (agregado); LSC/LIC = p̄ ± 3·√(p̄(1−p̄)/nᵢ), variando com o tamanho de cada período. */
export function proportionChart(observations: readonly ProportionObservation[]): ControlChartData {
  const totalDefective = observations.reduce((sum, o) => sum + o.defective, 0);
  const totalInspected = observations.reduce((sum, o) => sum + o.inspected, 0);
  const pBar = totalInspected ? totalDefective / totalInspected : 0;
  return {
    center: pBar,
    points: observations.map((o) => {
      const p = o.inspected ? o.defective / o.inspected : 0;
      const sigma = o.inspected ? Math.sqrt((pBar * (1 - pBar)) / o.inspected) : 0;
      const ucl = Math.min(1, pBar + 3 * sigma);
      const lcl = Math.max(0, pBar - 3 * sigma);
      return {
        label: o.period,
        value: p,
        ucl,
        lcl,
        outOfControl: p > ucl || p < lcl,
        detail: `${o.defective} de ${o.inspected} PTAs devolvidos${o.note ? ' · ' + o.note : ''}`,
      };
    }),
  };
}

function mean(values: readonly number[]): number {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}
