import { Routes } from '@angular/router';
import { routes } from '../../app.routes';
import { mockEntityCatalog } from '../../core/mocks/entity-catalog.mock';
import { QUALITY_DATASET } from '../../core/mocks/quality.mock';
import { ObservationContext } from '../../core/models';
import engagementRoutes from '../engagements/engagements.routes';
import workpaperRoutes from '../workpapers/workpapers.routes';
import { analyzeQuality, buildDrillDown } from './quality-analysis';
import { OperationalStep, resolveOperationalLinks, UNLINKED_NOTE } from './quality-links';

const catalog = mockEntityCatalog();
const firm = analyzeQuality(QUALITY_DATASET, {});

const stepsOf = (
  metricId: string,
  pointId: string,
  chart: 'primary' | 'moving-range' = 'primary',
) => {
  const analysis = firm.analyses.find((a) => a.definition.id === metricId)!;
  const drill = buildDrillDown(analysis, chart, pointId)!;
  return resolveOperationalLinks(
    catalog,
    drill.point.context,
    analysis.definition.method !== 'I-MR',
  );
};
const step = (steps: readonly OperationalStep[], label: string) =>
  steps.find((s) => s.label === label);

describe('Drill-down de Qualidade → registros operacionais', () => {
  it('Cenário C — sinal de retrabalho abre o Trabalho e o quadro do cliente com maior concentração', () => {
    const { steps, hasOperationalLink } = stepsOf('rework', '2026-04');
    expect(hasOperationalLink).toBe(true);
    expect(step(steps, 'Cliente com maior concentração')).toMatchObject({
      value: 'Gama S.A.',
      state: 'reference',
    });
    expect(step(steps, 'Trabalho')).toMatchObject({
      state: 'linked',
      link: { commands: ['/engagements', 'eng-gama-2026'] },
      linkLabel: 'Abrir trabalho',
    });
    // Gama 2026 não tem quadro Kanban no protótipo: nenhum link de quadro é oferecido.
    expect(step(steps, 'Quadro Kanban')).toBeUndefined();
  });

  it('Qualidade × Kanban — trabalho com quadro oferece "Abrir quadro"', () => {
    const { steps } = stepsOf('review-notes', '2026-08');
    expect(step(steps, 'Trabalho')?.link?.commands).toEqual(['/engagements', 'eng-alfa-2026']);
    expect(step(steps, 'Quadro Kanban')).toMatchObject({
      state: 'linked',
      link: { commands: ['/workflow'], queryParams: { board: 'board-alfa-2026' } },
    });
  });

  it('Cenário D — observação com workpaperId canônico abre o PTA (fixture)', () => {
    // O histórico estatístico do mock não tem PTA operacional vinculado; a fixture usa
    // um contexto válido sem alterar os dados das cartas.
    const context: ObservationContext = {
      clientId: 'cli-alfa',
      clientName: 'Empresa Alfa S.A.',
      engagementId: 'eng-alfa-2026',
      engagementName: 'Auditoria das DFs 2026',
      auditArea: 'Receita',
      workpaperId: 'PTA-REC-001',
    };
    const { steps } = resolveOperationalLinks(catalog, context, false);
    expect(step(steps, 'PTA')).toMatchObject({
      state: 'linked',
      link: { commands: ['/workpapers', 'PTA-REC-001'] },
      linkLabel: 'Abrir PTA',
    });
  });

  it('Cenário E — observação de trabalho histórico, sem PTA operacional, não oferece navegação', () => {
    const analysis = firm.analyses.find((a) => a.definition.id === 'hours-deviation')!;
    const historical = analysis.chart!.points.find(
      (p) => p.context?.engagementId === 'eng-beta-2025',
    )!;
    const { steps, hasOperationalLink } = stepsOf('hours-deviation', historical.id);
    expect(hasOperationalLink).toBe(false);
    expect(step(steps, 'Trabalho')?.state).toBe('historical');
    expect(step(steps, 'Trabalho')?.link).toBeUndefined();
    expect(steps.every((s) => !s.link)).toBe(true);
  });

  it('código de PTA da fonte estatística aparece como vínculo não identificado', () => {
    const analysis = firm.analyses.find((a) => a.definition.id === 'review-cycle')!;
    const outlier = analysis.chart!.points.find((p) => p.outOfControl)!;
    const { steps } = stepsOf('review-cycle', outlier.id);
    expect(step(steps, 'PTA (código na origem)')).toMatchObject({
      value: outlier.id,
      state: 'unlinked',
      note: UNLINKED_NOTE,
    });
  });

  it('id canônico inexistente nunca vira link', () => {
    const { steps } = resolveOperationalLinks(
      catalog,
      { engagementId: 'eng-zeta-2026', workpaperId: 'PTA-REC-999' },
      false,
    );
    expect(steps.map((s) => s.state)).toEqual(['unlinked', 'unlinked']);
    expect(steps.every((s) => !s.link)).toBe(true);
  });

  it('todos os pontos de todos os indicadores resolvem sem link inválido', () => {
    for (const analysis of firm.analyses) {
      for (const [kind, chart] of [
        ['primary', analysis.chart],
        ['moving-range', analysis.movingRange],
      ] as const) {
        for (const point of chart?.points ?? []) {
          const { steps } = stepsOf(analysis.definition.id, point.id, kind);
          for (const s of steps) {
            if (s.link) {
              expect(isRealRoute(s.link.commands)).toBe(true);
            } else if (s.state === 'unlinked' || s.state === 'historical') {
              expect(s.note).toBeTruthy();
            }
          }
        }
      }
    }
  });
});

describe('Rotas usadas pela navegação contextual', () => {
  it('existem no Router', () => {
    expect(isRealRoute(['/engagements', 'eng-alfa-2026'])).toBe(true);
    expect(isRealRoute(['/workpapers', 'PTA-REC-001'])).toBe(true);
    expect(isRealRoute(['/workflow'])).toBe(true);
    expect(isRealRoute(['/inexistente', 'x'])).toBe(false);
  });
});

/** Confere se os comandos casam com uma rota declarada (incluindo filhos com `:id`). */
function isRealRoute(commands: readonly string[]): boolean {
  const [first, ...rest] = commands.map((c) => c.replace(/^\//, ''));
  const shell = routes[0].children ?? [];
  const top = shell.find((r) => r.path === first);
  if (!top) return false;
  if (!rest.length) return true;
  const children: Routes =
    first === 'engagements' ? engagementRoutes : first === 'workpapers' ? workpaperRoutes : [];
  return children.some((r) => r.path === ':id');
}
