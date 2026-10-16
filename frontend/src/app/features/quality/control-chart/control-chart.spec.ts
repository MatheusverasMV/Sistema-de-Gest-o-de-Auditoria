import { TestBed } from '@angular/core/testing';
import { ControlChartData } from '../../../core/models';
import { ControlChart } from './control-chart';

const DATA: ControlChartData = {
  center: 5,
  points: [
    { id: 'p1', label: 'jan', value: 4.8, ucl: 7, lcl: 3, outOfControl: false },
    { id: 'p2', label: 'fev', value: 5.4, ucl: 7, lcl: 3, outOfControl: false, flag: 'attention' },
    { id: 'p3', label: 'mar', value: 5.1, ucl: 7, lcl: 3, outOfControl: false, flag: 'info' },
    { id: 'p4', label: 'abr', value: 9.2, ucl: 7, lcl: 3, outOfControl: true, flag: 'critical' },
  ],
};

describe('Carta de controle — apresentação da Fase 5', () => {
  // O jsdom não implementa ResizeObserver; a carta usa a largura padrão (720 px).
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as typeof ResizeObserver;
  });

  function render() {
    const fixture = TestBed.createComponent(ControlChart);
    fixture.componentRef.setInput('data', DATA);
    fixture.componentRef.setInput('format', (v: number) => v.toFixed(1));
    fixture.componentRef.setInput('label', 'Carta de teste');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('desenha um marcador por observação, com a forma de cada classificação', () => {
    const host = render();
    expect(host.querySelectorAll('circle.point').length).toBe(3);
    expect(host.querySelectorAll('path.point--critical').length).toBe(1);
    expect(host.querySelectorAll('.point--attention').length).toBe(1);
    expect(host.querySelectorAll('.point--info').length).toBe(1);
    expect(host.querySelectorAll('path.limit').length).toBe(2);
    expect(host.querySelector('line.center')).not.toBeNull();
  });

  it('mantém os valores dos limites nos rótulos e na tabela acessível', () => {
    const host = render();
    const labels = [...host.querySelectorAll('.limit-label')].map((t) => t.textContent?.trim());
    expect(labels).toEqual(['LSC 7.0', 'LC 5.0', 'LIC 3.0']);
    const rows = host.querySelectorAll('.sr-only tbody tr');
    expect(rows.length).toBe(DATA.points.length);
    expect(rows[3].textContent).toContain('9.2');
  });

  it('a legenda só lista os tipos de sinal presentes na carta', () => {
    const legend = render().querySelector('.legend')!;
    expect(legend.querySelector('.key--signal')).not.toBeNull();
    expect(legend.querySelector('.key--attention')).not.toBeNull();
    expect(legend.querySelector('.key--info')).not.toBeNull();
    expect(legend.querySelector('.key--limit')).not.toBeNull();
  });

  it('legenda e rótulo seguem o marcador desenhado (ponto além do LSC com sinal de atenção)', () => {
    const fixture = TestBed.createComponent(ControlChart);
    fixture.componentRef.setInput('data', {
      center: 1,
      points: [
        { id: 'm1', label: 'jan', value: 0.8, ucl: 2, lcl: 0, outOfControl: false },
        {
          id: 'm2',
          label: 'fev',
          value: 2.8,
          ucl: 2,
          lcl: 0,
          outOfControl: true,
          flag: 'attention',
        },
      ],
    } satisfies ControlChartData);
    fixture.componentRef.setInput('format', (v: number) => v.toFixed(1));
    fixture.componentRef.setInput('label', 'Amplitude móvel');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.point--attention')).not.toBeNull();
    expect(host.querySelector('.legend .key--attention')).not.toBeNull();
    expect(host.querySelector('.legend .key--signal')).toBeNull();
    expect(host.querySelector('.signal-label--attention')?.textContent?.trim()).toBe('2.8');
  });

  it('tooltip do último ponto abre à esquerda, sem cobrir a coluna de rótulos LSC/LC/LIC', () => {
    const fixture = TestBed.createComponent(ControlChart);
    fixture.componentRef.setInput('data', DATA);
    fixture.componentRef.setInput('format', (v: number) => v.toFixed(1));
    fixture.componentRef.setInput('label', 'Carta de teste');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const hits = host.querySelectorAll('rect.hit');
    hits[hits.length - 1].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    const tooltip = host.querySelector<HTMLElement>('.tooltip')!;
    const left = parseFloat(tooltip.style.left);
    // Largura padrão 720 px; a coluna de rótulos começa em 720 - 84 = 636 px.
    expect(left).toBeGreaterThanOrEqual(0);
    expect(left + 260).toBeLessThanOrEqual(636);
    expect(tooltip.textContent).toContain('9.2');
  });
});
