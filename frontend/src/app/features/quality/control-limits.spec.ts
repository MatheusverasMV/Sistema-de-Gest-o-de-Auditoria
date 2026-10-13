import {
  estimateIndividualsBaseline,
  estimateProportionCenter,
  estimateRateCenter,
  hoursDeviation,
  individualsChart,
  individualsMovingRangeChart,
  movingRangeChart,
  movingRanges,
  proportionChart,
  uChart,
} from './control-limits';
import { formatPer100, formatPer100Short, formatSignedPercent, per100 } from './quality-format';

const series = (...values: number[]) => values.map((value, i) => ({ label: `#${i + 1}`, value }));

describe('individualsChart', () => {
  it('calcula LC, MR̄ e limites com 2,66 × MR̄', () => {
    // média 11; MR = [2, 1] → MR̄ 1,5 → ±3,99
    const chart = individualsChart(series(10, 12, 11));
    expect(chart.center).toBeCloseTo(11);
    expect(estimateIndividualsBaseline([10, 12, 11]).movingRangeMean).toBeCloseTo(1.5);
    expect(chart.points[0].ucl).toBeCloseTo(14.99);
    expect(chart.points[0].lcl).toBeCloseTo(7.01);
    expect(chart.points.some((p) => p.outOfControl)).toBe(false);
  });

  it('respeita o limite inferior natural apenas quando informado', () => {
    const data = series(1, 9);
    expect(individualsChart(data, undefined, { lowerBound: 0 }).points[0].lcl).toBe(0);
    // Sem lowerBound o LIC pode ser negativo: 5 − 2,66 × 8.
    expect(individualsChart(data).points[0].lcl).toBeCloseTo(5 - 2.66 * 8);
  });

  it('aceita valores e linha central negativos', () => {
    const chart = individualsChart(series(-0.1, -0.2, -0.15, -0.05));
    expect(chart.center).toBeCloseTo(-0.125);
    expect(chart.points[0].lcl).toBeLessThan(chart.center);
    expect(chart.points[0].ucl).toBeLessThan(0.2);
    expect(chart.points.every((p) => !p.outOfControl)).toBe(true);
  });

  it('aplica uma baseline congelada sem reestimar com os pontos monitorados', () => {
    const baseline = { center: 4, movingRangeMean: 0.5 };
    const chart = individualsChart(series(4, 4.2, 9), baseline);
    expect(chart.center).toBe(4);
    expect(chart.points[2].ucl).toBeCloseTo(5.33);
    expect(chart.points[2].outOfControl).toBe(true);
  });
});

describe('movingRangeChart', () => {
  it('calcula MRᵢ = |Xᵢ − Xᵢ₋₁| e MR̄', () => {
    expect(movingRanges([4, 6, 3, 3])).toEqual([2, 3, 0]);
    const chart = movingRangeChart(series(4, 6, 3, 3));
    expect(chart.points.map((p) => p.value)).toEqual([2, 3, 0]);
    expect(chart.center).toBeCloseTo(5 / 3);
  });

  it('usa LSC = 3,267 × MR̄ e LIC = 0', () => {
    const chart = movingRangeChart(series(4, 6, 3, 3));
    expect(chart.points[0].ucl).toBeCloseTo(3.267 * (5 / 3));
    expect(chart.points.every((p) => p.lcl === 0)).toBe(true);
  });

  it('associa cada amplitude à observação mais recente do par', () => {
    const chart = movingRangeChart([
      { id: 'A', label: 'A', value: 1 },
      { id: 'B', label: 'B', value: 2 },
    ]);
    expect(chart.points.map((p) => p.id)).toEqual(['B']);
  });

  it('detecta amplitude acima do LSC', () => {
    const chart = movingRangeChart(series(5, 5.2, 4.9, 9), { center: 5, movingRangeMean: 0.3 });
    expect(chart.points.map((p) => p.outOfControl)).toEqual([false, false, true]);
  });
});

describe('individualsMovingRangeChart', () => {
  it('produz as duas cartas com a mesma baseline', () => {
    const { individuals, movingRange } = individualsMovingRangeChart(series(10, 12, 11));
    expect(individuals.points).toHaveLength(3);
    expect(movingRange.points).toHaveLength(2);
    expect(movingRange.center).toBeCloseTo(1.5);
  });
});

describe('proportionChart', () => {
  it('usa p̄ agregado, não a média das proporções', () => {
    const data = [
      { label: 'a', count: 10, exposure: 100 },
      { label: 'b', count: 5, exposure: 25 },
    ];
    // agregado 15/125 = 0,12; média simples seria (0,10 + 0,20) / 2 = 0,15
    expect(estimateProportionCenter(data)).toBeCloseTo(0.12);
    expect(proportionChart(data).center).toBeCloseTo(0.12);
  });

  it('varia os limites com o denominador de cada período', () => {
    const chart = proportionChart([
      { label: 'a', count: 10, exposure: 100 },
      { label: 'b', count: 5, exposure: 25 },
    ]);
    const sigma = (n: number) => Math.sqrt((0.12 * 0.88) / n);
    expect(chart.points[0].ucl).toBeCloseTo(0.12 + 3 * sigma(100));
    expect(chart.points[1].ucl).toBeCloseTo(0.12 + 3 * sigma(25));
    expect(chart.points[1].ucl).toBeGreaterThan(chart.points[0].ucl);
  });

  it('nunca gera LIC abaixo de zero', () => {
    const chart = proportionChart([
      { label: 'a', count: 1, exposure: 10 },
      { label: 'b', count: 2, exposure: 12 },
    ]);
    expect(chart.points.every((p) => p.lcl === 0)).toBe(true);
  });
});

describe('uChart', () => {
  const data = [
    { label: 'a', count: 30, exposure: 100 },
    { label: 'b', count: 20, exposure: 40 },
  ];

  it('usa ū agregado = Σ review notes / Σ PTAs revisados', () => {
    expect(estimateRateCenter(data)).toBeCloseTo(50 / 140);
    expect(uChart(data).points.map((p) => p.value)).toEqual([0.3, 0.5]);
  });

  it('varia os limites com nᵢ: ū ± 3·√(ū/nᵢ), LIC ≥ 0', () => {
    const chart = uChart(data, 0.35);
    expect(chart.points[0].ucl).toBeCloseTo(0.35 + 3 * Math.sqrt(0.35 / 100));
    expect(chart.points[1].ucl).toBeCloseTo(0.35 + 3 * Math.sqrt(0.35 / 40));
    expect(chart.points[0].lcl).toBeCloseTo(0.35 - 3 * Math.sqrt(0.35 / 100));
    expect(uChart([{ label: 'c', count: 1, exposure: 5 }], 0.35).points[0].lcl).toBe(0);
  });

  it('apresenta a taxa por 100 PTAs', () => {
    expect(per100(0.084)).toBeCloseTo(8.4);
    expect(formatPer100Short(0.084)).toBe('8,4');
    expect(formatPer100(0.084)).toBe('8,4 por 100 PTAs');
  });
});

describe('hoursDeviation', () => {
  it('100 planejadas e 125 realizadas → +25%', () => {
    expect(hoursDeviation(100, 125)).toBeCloseTo(0.25);
    expect(formatSignedPercent(hoursDeviation(100, 125))).toBe('+25,0%');
  });

  it('100 planejadas e 80 realizadas → −20%', () => {
    expect(hoursDeviation(100, 80)).toBeCloseTo(-0.2);
    expect(formatSignedPercent(hoursDeviation(100, 80))).toBe('-20,0%');
  });
});
