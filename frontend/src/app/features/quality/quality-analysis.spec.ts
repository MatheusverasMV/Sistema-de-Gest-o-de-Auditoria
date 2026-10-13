import { QUALITY_DATASET } from '../../core/mocks/quality.mock';
import { QualityMetricId } from '../../core/models';
import {
  estimateIndividualsBaseline,
  estimateProportionCenter,
  hoursDeviation,
} from './control-limits';
import {
  analyzeQuality,
  buildDrillDown,
  currentBaseline,
  filterOptions,
  MetricAnalysis,
} from './quality-analysis';
import { QUALITY_METRICS } from './quality-metrics';

const firm = analyzeQuality(QUALITY_DATASET, {});
const analysis = (id: QualityMetricId, view = firm): MetricAnalysis =>
  view.analyses.find((a) => a.definition.id === id)!;
const signalsOf = (id: QualityMetricId, view = firm) =>
  analysis(id, view).signals.map((s) => `${s.severity}:${s.rule}:${s.pointLabel}`);

describe('MVP de Qualidade & Processos', () => {
  it('contempla exatamente os seis indicadores, com o método correto', () => {
    expect(QUALITY_METRICS.map((m) => `${m.id}:${m.method}`)).toEqual([
      'review-cycle:I-MR',
      'note-resolution:I-MR',
      'rework:p',
      'review-notes:u',
      'overdue-requests:p',
      'hours-deviation:I-MR',
    ]);
  });

  it('métricas I-MR produzem carta de indivíduos e de amplitude móvel', () => {
    for (const id of ['review-cycle', 'note-resolution', 'hours-deviation'] as const) {
      const a = analysis(id);
      expect(a.chart!.points.length).toBe(a.movingRange!.points.length + 1);
    }
    for (const id of ['rework', 'review-notes', 'overdue-requests'] as const) {
      expect(analysis(id).movingRange).toBeNull();
    }
  });
});

describe('Baselines aprovadas do mock', () => {
  const window = (id: QualityMetricId) => currentBaseline(QUALITY_DATASET.baselines, id).reference;
  const inWindow = (date: string, w: { from: string; to: string }) =>
    date >= w.from && date <= w.to;

  it('os parâmetros congelados correspondem ao período de referência (I-MR)', () => {
    const cases = [
      ['review-cycle', QUALITY_DATASET.reviewCycle.map((o) => ({ date: o.date, value: o.value }))],
      [
        'note-resolution',
        QUALITY_DATASET.noteResolution.map((o) => ({ date: o.date, value: o.value })),
      ],
      [
        'hours-deviation',
        QUALITY_DATASET.hoursDeviation.map((o) => ({
          date: o.date,
          value: hoursDeviation(o.plannedHours, o.actualHours),
        })),
      ],
    ] as const;
    for (const [id, observations] of cases) {
      const baseline = currentBaseline(QUALITY_DATASET.baselines, id);
      const reference = observations.filter((o) => inWindow(o.date, window(id)));
      const estimate = estimateIndividualsBaseline(reference.map((o) => o.value));
      expect(reference).toHaveLength(baseline.sampleSize);
      expect(baseline.centerLine).toBeCloseTo(estimate.center, 2);
      expect(baseline.parameters.movingRangeMean).toBeCloseTo(estimate.movingRangeMean, 2);
    }
  });

  it('os parâmetros congelados correspondem ao período de referência (p/u)', () => {
    const cases = [
      ['rework', QUALITY_DATASET.rework],
      ['review-notes', QUALITY_DATASET.reviewNotes],
      ['overdue-requests', QUALITY_DATASET.overdueRequests],
    ] as const;
    for (const [id, records] of cases) {
      const baseline = currentBaseline(QUALITY_DATASET.baselines, id);
      const reference = records.filter((r) => inWindow(`${r.period}-01`, window(id)));
      expect(baseline.centerLine).toBeCloseTo(
        estimateProportionCenter(reference.map((r) => ({ label: r.period, ...r }))),
        4,
      );
    }
  });

  it('usa a versão vigente e não recalcula os limites com os pontos monitorados', () => {
    const cycle = analysis('review-cycle');
    expect(cycle.baseline).toMatchObject({ source: 'approved', version: 2, status: 'monitoring' });
    expect(cycle.chart!.center).toBe(4.41);
    const monitored = cycle.chart!.points.filter((p) => p.phase === 'monitoring');
    expect(monitored.length).toBeGreaterThan(0);
    expect(new Set(cycle.chart!.points.map((p) => p.ucl)).size).toBe(1);
  });
});

describe('Causas especiais deliberadas do mock', () => {
  it('tempo de ciclo: unidade é o PTA individual e há dois PTAs fora de controle', () => {
    const cycle = analysis('review-cycle');
    expect(cycle.chart!.points.every((p) => p.id.startsWith('PTA-'))).toBe(true);
    const out = cycle.chart!.points.filter((p) => p.outOfControl);
    expect(out.map((p) => [p.context?.clientName, p.value])).toEqual([
      ['Gama S.A.', 11.2],
      ['Empresa Alfa S.A.', 10.4],
    ]);
    expect(
      signalsOf('review-cycle').filter((s) => s.startsWith('critical:beyond-limits')),
    ).toHaveLength(2);
  });

  it('tempo de ciclo: a amplitude móvel revela o aumento de variabilidade no fim de set/26', () => {
    const variability = analysis('review-cycle').signals.filter((s) => s.rule === 'variability');
    expect(variability).toHaveLength(1);
    expect(variability[0]).toMatchObject({ severity: 'attention', chart: 'moving-range' });
    expect(variability[0].date >= '2026-09-20').toBe(true);
  });

  it('retrabalho: abr/26 acima do LSC (17 de 52), concentrado em Gama S.A. · Receita', () => {
    expect(signalsOf('rework')).toEqual(['critical:beyond-limits:abr/26']);
    const april = analysis('rework').chart!.points.find((p) => p.label === 'abr/26')!;
    expect(april.value).toBeCloseTo(17 / 52);
    expect(april.facts).toContainEqual({ label: 'PTAs devolvidos', value: '17 de 52' });
    expect(april.context).toMatchObject({ clientName: 'Gama S.A.', auditArea: 'Receita' });
  });

  it('pontos de revisão: ago/26 acima do LSC, concentrado em Alfa · Contas a Receber', () => {
    expect(signalsOf('review-notes')).toEqual(['critical:beyond-limits:ago/26']);
    const august = analysis('review-notes').chart!.points.find((p) => p.label === 'ago/26')!;
    expect(august.context).toMatchObject({
      clientName: 'Empresa Alfa S.A.',
      auditArea: 'Contas a Receber',
    });
  });

  it('resolução de pontos: seis observações finais em alta, dentro dos limites', () => {
    expect(signalsOf('note-resolution')).toEqual(['attention:trend:RN-143 → RN-148']);
    const points = analysis('note-resolution').chart!.points;
    expect(points.slice(-6).every((p) => !p.outOfControl && p.flag === 'attention')).toBe(true);
  });

  it('solicitações vencidas: alta contínua de abr/26 a set/26', () => {
    expect(signalsOf('overdue-requests')).toEqual(['attention:trend:abr/26 → set/26']);
  });

  it('desvio de horas: atividade de Gama +62%, com valores e LIC negativos', () => {
    expect(signalsOf('hours-deviation')).toEqual([
      'critical:beyond-limits:Gama 2026 · Fornecedores',
    ]);
    const chart = analysis('hours-deviation').chart!;
    expect(chart.points.some((p) => p.value < 0)).toBe(true);
    expect(chart.points[0].lcl).toBeLessThan(0);
    const outlier = chart.points.find((p) => p.outOfControl)!;
    expect(outlier.value).toBeCloseTo(0.62);
    expect(outlier.facts).toContainEqual({ label: 'Horas planejadas', value: '200 h' });
  });

  it('ordena os sinais por severidade e depois por recência', () => {
    const severities = firm.signals.map((s) => s.severity);
    expect(severities).toEqual([...severities].sort((a, b) => rank(a) - rank(b)));
    const critical = firm.signals.filter((s) => s.severity === 'critical');
    const dates = critical.map((s) => s.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('Estratificação por filtros', () => {
  it('um recorte recebe baseline provisória própria, não a da firma', () => {
    const gama = analyzeQuality(QUALITY_DATASET, { clientId: 'cli-gama' });
    const rework = analysis('rework', gama);
    expect(rework.baseline).toMatchObject({ source: 'segment', status: 'provisional' });
    expect(rework.chart!.center).not.toBeCloseTo(analysis('rework').chart!.center, 3);
    expect(rework.chart!.points.find((p) => p.label === 'abr/26')!.facts).toContainEqual({
      label: 'PTAs devolvidos',
      value: '15 de 30',
    });
  });

  it('população insuficiente não recebe limites inventados', () => {
    const inventory = analyzeQuality(QUALITY_DATASET, { auditArea: 'Estoques' });
    for (const a of inventory.analyses) {
      expect(a.chart).toBeNull();
      expect(a.baseline.status).toBe('collecting');
      expect(a.signals).toEqual([]);
    }
  });

  it('recorte sem ocorrências na referência é tratado como insuficiente', () => {
    const cash = analyzeQuality(QUALITY_DATASET, { auditArea: 'Caixa e Equivalentes' });
    const overdue = analysis('overdue-requests', cash);
    expect(overdue.chart).toBeNull();
    expect(overdue.baseline.insufficiency).toBe('no-events');
  });

  it('opções de filtro em cascata', () => {
    const all = filterOptions(QUALITY_DATASET, {});
    expect(all.clients.map((c) => c.label)).toEqual([
      'Beta Ltda.',
      'Empresa Alfa S.A.',
      'Gama S.A.',
    ]);
    const gama = filterOptions(QUALITY_DATASET, { clientId: 'cli-gama' });
    expect(gama.engagements.map((e) => e.value).sort()).toEqual(['eng-gama-2025', 'eng-gama-2026']);
    expect(gama.areas.map((a) => a.value)).toEqual(['Fornecedores', 'Receita', 'Tributos']);
  });
});

describe('Drill-down', () => {
  it('decompõe o mês sinalizado por segmento, do maior para o menor', () => {
    const drill = buildDrillDown(analysis('rework'), 'primary', '2026-04')!;
    expect(drill.signals.map((s) => s.title)).toEqual(['Causa especial detectada']);
    expect(drill.breakdown[0]).toMatchObject({
      clientName: 'Gama S.A.',
      auditArea: 'Receita',
      count: 9,
      exposure: 14,
    });
    expect(drill.point.context).toMatchObject({
      clientId: 'cli-gama',
      engagementId: 'eng-gama-2026',
    });
  });

  it('preserva o contexto cliente → trabalho → área → código de PTA da observação', () => {
    const cycle = analysis('review-cycle');
    const outlier = cycle.chart!.points.find((p) => p.outOfControl)!;
    const drill = buildDrillDown(cycle, 'primary', outlier.id)!;
    expect(drill.point.context).toMatchObject({
      clientId: 'cli-gama',
      engagementId: 'eng-gama-2026',
      auditArea: 'Fornecedores',
      workpaperCode: outlier.id,
    });
    expect(drill.point.detail).toContain('partes relacionadas');
  });

  it('lista todas as observações de uma tendência', () => {
    const notes = analysis('note-resolution');
    const drill = buildDrillDown(notes, 'primary', notes.signals[0].pointId)!;
    expect(drill.related).toHaveLength(6);
  });
});

function rank(severity: string): number {
  return ['critical', 'attention', 'info'].indexOf(severity);
}
