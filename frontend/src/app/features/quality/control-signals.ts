import { ControlChartData, QualitySeverity } from '../../core/models';

/**
 * Regras de detecção desta versão. Propositalmente poucas: cada regra adicional
 * aumenta a taxa global de alarmes falsos e a fadiga de alertas.
 *
 * - Um ponto além dos limites de controle (3σ).
 * - Seis pontos consecutivos continuamente crescentes ou decrescentes.
 */

/** Pontos consecutivos exigidos pela regra de tendência. */
export const TREND_RUN_LENGTH = 6;

/** Sentido em que a métrica piora. */
export type MetricPolarity = 'higher-is-worse' | 'lower-is-worse';

export type Direction = 'up' | 'down';

export interface SignalHit {
  readonly rule: 'beyond-limits' | 'trend';
  readonly direction: Direction;
  /** Índices dos pontos envolvidos; o último ancora o sinal. */
  readonly indices: readonly number[];
}

/** Um sinal por ponto fora dos limites, com o sentido do desvio. */
export function detectBeyondLimits(chart: ControlChartData): SignalHit[] {
  return chart.points.flatMap((p, i) =>
    p.outOfControl
      ? [
          {
            rule: 'beyond-limits' as const,
            direction: p.value > p.ucl ? 'up' : 'down',
            indices: [i],
          },
        ]
      : [],
  );
}

/**
 * Sequências de pelo menos `length` pontos estritamente crescentes ou decrescentes.
 * Uma sequência maior gera um único sinal (a sequência máxima), não um por janela.
 * Valores iguais interrompem a sequência.
 */
export function detectTrends(values: readonly number[], length = TREND_RUN_LENGTH): SignalHit[] {
  const hits: SignalHit[] = [];
  let start = 0;
  let direction: Direction | null = null;
  const close = (end: number) => {
    if (direction && end - start + 1 >= length) {
      hits.push({
        rule: 'trend',
        direction,
        indices: Array.from({ length: end - start + 1 }, (_, k) => start + k),
      });
    }
  };
  for (let i = 1; i < values.length; i++) {
    const step: Direction | null =
      values[i] > values[i - 1] ? 'up' : values[i] < values[i - 1] ? 'down' : null;
    if (step !== direction || step === null) {
      close(i - 1);
      start = step === null ? i : i - 1;
      direction = step;
    }
  }
  close(values.length - 1);
  return hits;
}

/** Aplica as regras ativas à série principal de uma carta. */
export function detectControlSignals(chart: ControlChartData): SignalHit[] {
  return [...detectBeyondLimits(chart), ...detectTrends(chart.points.map((p) => p.value))];
}

/** O sinal aponta no sentido em que a métrica piora? */
export function isUnfavorable(direction: Direction, polarity: MetricPolarity): boolean {
  return polarity === 'higher-is-worse' ? direction === 'up' : direction === 'down';
}

/**
 * Severidade conforme a regra e o sentido da métrica:
 * - fora dos limites no sentido de piora → Crítico; no sentido favorável → Atenção
 *   (ainda é causa especial: pode ser melhoria real ou subnotificação);
 * - tendência de piora → Atenção; tendência favorável → Informativo.
 */
export function classifySignal(hit: SignalHit, polarity: MetricPolarity): QualitySeverity {
  const unfavorable = isUnfavorable(hit.direction, polarity);
  if (hit.rule === 'beyond-limits') {
    return unfavorable ? 'critical' : 'attention';
  }
  return unfavorable ? 'attention' : 'info';
}

/**
 * Pontos fora do LSC na carta MR que não são explicados por um ponto fora de controle
 * na carta I (MRᵢ envolve Xᵢ e Xᵢ₋₁), agrupados quando próximos. Cada grupo indica
 * aumento de variabilidade com o nível ainda dentro dos limites.
 *
 * Índices de `movingRange` correspondem à observação i + 1 da carta I.
 */
export function detectVariabilityIncreases(
  individuals: ControlChartData,
  movingRange: ControlChartData,
): number[][] {
  const groups: number[][] = [];
  movingRange.points.forEach((p, i) => {
    const explained =
      individuals.points[i + 1]?.outOfControl || individuals.points[i]?.outOfControl;
    if (!p.outOfControl || explained) {
      return;
    }
    const last = groups[groups.length - 1];
    if (last && i - last[last.length - 1] <= 2) {
      last.push(i);
    } else {
      groups.push([i]);
    }
  });
  return groups;
}
