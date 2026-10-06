import { QUALITY_DATASET } from '../../core/mocks/quality.mock';
import { individualsChart, proportionChart } from './control-limits';

describe('individualsChart', () => {
  it('calcula LC e limites com 2,66 × amplitude móvel média', () => {
    const chart = individualsChart([
      { period: 'a', value: 10 },
      { period: 'b', value: 12 },
      { period: 'c', value: 11 },
    ]);
    // média 11; MR = [2, 1] → MR̄ 1,5 → ±3,99
    expect(chart.center).toBeCloseTo(11);
    expect(chart.points[0].ucl).toBeCloseTo(14.99);
    expect(chart.points[0].lcl).toBeCloseTo(7.01);
    expect(chart.points.some((p) => p.outOfControl)).toBe(false);
  });

  it('nunca gera LIC negativo', () => {
    const chart = individualsChart([
      { period: 'a', value: 1 },
      { period: 'b', value: 9 },
    ]);
    expect(chart.points[0].lcl).toBe(0);
  });

  it('destaca exatamente as duas semanas anômalas do mock', () => {
    const chart = individualsChart(QUALITY_DATASET.reviewCycleTime);
    expect(chart.points.filter((p) => p.outOfControl).map((p) => p.label)).toEqual(['S29', 'S37']);
  });
});

describe('proportionChart', () => {
  it('usa p̄ agregado e limites que variam com n', () => {
    const chart = proportionChart([
      { period: 'a', defective: 10, inspected: 100 },
      { period: 'b', defective: 5, inspected: 25 },
    ]);
    expect(chart.center).toBeCloseTo(0.12);
    expect(chart.points[1].ucl - chart.center).toBeGreaterThan(chart.points[0].ucl - chart.center);
  });

  it('sinaliza abril/26 como fora de controle no mock', () => {
    const chart = proportionChart(QUALITY_DATASET.reworkRate);
    expect(chart.points.filter((p) => p.outOfControl).map((p) => p.label)).toEqual(['abr/26']);
  });
});
