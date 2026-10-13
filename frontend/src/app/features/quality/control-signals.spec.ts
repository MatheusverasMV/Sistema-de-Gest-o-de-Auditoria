import { ControlChartData } from '../../core/models';
import { individualsChart, movingRangeChart } from './control-limits';
import {
  classifySignal,
  detectBeyondLimits,
  detectControlSignals,
  detectTrends,
  detectVariabilityIncreases,
} from './control-signals';

const chartOf = (
  values: number[],
  baseline = { center: 5, movingRangeMean: 1 },
): ControlChartData =>
  individualsChart(
    values.map((value, i) => ({ label: `#${i}`, value })),
    baseline,
  );

describe('detectBeyondLimits', () => {
  it('ponto acima do LSC → sinal Crítico em métrica em que alta é piora', () => {
    const hits = detectBeyondLimits(chartOf([5, 5.5, 9]));
    expect(hits).toEqual([{ rule: 'beyond-limits', direction: 'up', indices: [2] }]);
    expect(classifySignal(hits[0], 'higher-is-worse')).toBe('critical');
  });

  it('ponto abaixo do LIC no sentido favorável → Atenção, não Crítico', () => {
    const hits = detectBeyondLimits(chartOf([5, 4.5, 1]));
    expect(hits[0].direction).toBe('down');
    expect(classifySignal(hits[0], 'higher-is-worse')).toBe('attention');
    expect(classifySignal(hits[0], 'lower-is-worse')).toBe('critical');
  });
});

describe('detectTrends', () => {
  it('seis pontos crescentes → tendência; Atenção quando alta é piora', () => {
    const hits = detectTrends([1, 2, 3, 4, 5, 6]);
    expect(hits).toEqual([{ rule: 'trend', direction: 'up', indices: [0, 1, 2, 3, 4, 5] }]);
    expect(classifySignal(hits[0], 'higher-is-worse')).toBe('attention');
  });

  it('seis pontos decrescentes → tendência; Atenção quando queda é piora', () => {
    const hits = detectTrends([9, 8, 7, 6, 5, 4]);
    expect(hits).toHaveLength(1);
    expect(hits[0].direction).toBe('down');
    expect(classifySignal(hits[0], 'lower-is-worse')).toBe('attention');
    // Mesma queda em métrica em que alta é piora: melhora, apenas informativa.
    expect(classifySignal(hits[0], 'higher-is-worse')).toBe('info');
  });

  it('cinco pontos não bastam', () => {
    expect(detectTrends([1, 2, 3, 4, 5])).toEqual([]);
  });

  it('empates interrompem a sequência', () => {
    expect(detectTrends([1, 2, 3, 3, 4, 5, 6])).toEqual([]);
    expect(detectTrends([1, 2, 2, 3, 4, 5, 6, 7])[0].indices).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it('sequência longa gera um único sinal, com todos os pontos', () => {
    const hits = detectTrends([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(hits).toHaveLength(1);
    expect(hits[0].indices).toHaveLength(8);
  });
});

describe('detectControlSignals', () => {
  it('série estável não gera sinal', () => {
    expect(detectControlSignals(chartOf([5, 5.4, 4.8, 5.2, 4.9, 5.3, 4.7, 5.1, 5.0]))).toEqual([]);
  });
});

describe('detectVariabilityIncreases', () => {
  const baseline = { center: 5, movingRangeMean: 0.5 };
  const values = (v: number[]) => v.map((value, i) => ({ label: `#${i}`, value }));

  it('agrupa amplitudes altas com o nível dentro dos limites', () => {
    const data = values([5, 5.2, 4.9, 6.2, 3.9, 6.1, 4.0, 5.0]);
    const groups = detectVariabilityIncreases(
      individualsChart(data, baseline),
      movingRangeChart(data, baseline),
    );
    // LSC da MR = 3,267 × 0,5 ≈ 1,63: amplitudes 2,3 · 2,2 · 2,1 (índices 3–5 da MR)
    expect(groups).toEqual([[3, 4, 5]]);
  });

  it('ignora amplitudes explicadas por um ponto fora de controle na carta I', () => {
    const data = values([5, 5.2, 9.5, 5.1, 5.0]);
    expect(
      detectVariabilityIncreases(
        individualsChart(data, baseline),
        movingRangeChart(data, baseline),
      ),
    ).toEqual([]);
  });
});
