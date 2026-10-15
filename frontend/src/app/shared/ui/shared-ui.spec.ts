import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PRIORITY_META, RISK_META, WORKPAPER_STATUS_META } from '../../core/models';
import { Breadcrumb } from './breadcrumb/breadcrumb';
import { Drawer } from './drawer/drawer';
import { KpiCard } from './kpi-card/kpi-card';
import { StatusBadge } from './status-badge/status-badge';
import { Tabs } from './tabs/tabs';

function render<T>(type: Type<T>, inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(type);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}

describe('Componentes compartilhados — Fase 3', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  describe('StatusBadge', () => {
    it('mantém o rótulo e diferencia os status do fluxo do PTA', () => {
      const classes = Object.values(WORKPAPER_STATUS_META).map(
        (meta) => render(StatusBadge, { label: meta.label, tone: meta.tone }).host.className,
      );
      expect(new Set(classes).size).toBe(classes.length);
      const { host } = render(StatusBadge, { label: 'Finalizado', tone: 'success' });
      expect(host.textContent?.trim()).toBe('Finalizado');
      expect(host.querySelector('sga-icon')).not.toBeNull();
    });

    it('prioridade Alta não usa o tom de alarme', () => {
      const high = PRIORITY_META.high;
      const { host } = render(StatusBadge, {
        label: high.label,
        tone: high.tone,
        kind: 'priority',
      });
      expect(host.classList).toContain('badge--level-high');
      expect(host.classList).not.toContain('badge--danger');
      // Sem `kind`, o mesmo tom continua sendo alarme (pendências, falhas).
      expect(render(StatusBadge, { label: 'Falhou', tone: 'danger' }).host.classList).toContain(
        'badge--danger',
      );
    });

    it('risco usa a escala institucional', () => {
      const levels = (['low', 'medium', 'high'] as const).map(
        (level) =>
          render(StatusBadge, {
            label: RISK_META[level].label,
            tone: RISK_META[level].tone,
            kind: 'risk',
          }).host.className,
      );
      expect(levels).toEqual([
        'badge badge--risk-low',
        'badge badge--risk-medium',
        'badge badge--risk-high',
      ]);
    });
  });

  it('KpiCard: valor em destaque e marcador apenas para tons de atenção', () => {
    const neutral = render(KpiCard, {
      label: 'Trabalhos ativos',
      value: 3,
      icon: 'briefcase',
    }).host;
    expect(neutral.querySelector('.value')?.textContent).toBe('3');
    expect(neutral.querySelector('.marker')).toBeNull();
    const danger = render(KpiCard, { label: 'Pendências críticas', value: 2, tone: 'danger' }).host;
    expect(danger.querySelector('.marker')).not.toBeNull();
  });

  it('Breadcrumb preserva links, query params e o item atual', () => {
    const { host } = render(Breadcrumb, {
      items: [
        { label: 'Trabalhos', link: '/engagements' },
        {
          label: 'Empresa Alfa',
          link: '/engagements/eng-alfa-2026',
          queryParams: { tab: 'workpapers' },
        },
        { label: 'PTA-REC-001' },
      ],
    });
    const links = [...host.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/engagements', '/engagements/eng-alfa-2026?tab=workpapers']);
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('PTA-REC-001');
  });

  it('Tabs: nome acessível sem duplicação e navegação por teclado', () => {
    const { fixture, host } = render(Tabs, {
      tabs: [
        { id: 'overview', label: 'Visão geral' },
        { id: 'workpapers', label: 'PTAs', count: 8 },
      ],
      selected: 'overview',
    });
    const tabs = host.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(tabs[1].textContent?.replace(/\s+/g, ' ').trim()).toBe('PTAs 8');
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('Drawer abre e fecha pelo botão', () => {
    const { fixture, host } = render(Drawer, { heading: 'Detalhe', open: true });
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('button[aria-label="Fechar painel"]')!.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
});
