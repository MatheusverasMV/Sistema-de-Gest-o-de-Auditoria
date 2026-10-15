import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { provideMockRepositories } from '../../core/data/mock/mock-repositories';
import { PeopleService } from '../../core/services/people.service';
import { Sidebar } from './sidebar';

@Component({ template: '' })
class Blank {}

describe('Sidebar — restrição de Qualidade & Processos', () => {
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([{ path: '**', component: Blank }]), provideMockRepositories()],
    });
    await TestBed.inject(PeopleService).load();
  });

  function links(): string[] {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll('a.nav-link')].map(
      (a) => a.getAttribute('href') ?? '',
    );
  }

  it('oculta o módulo para Auditor Pleno', () => {
    TestBed.inject(SessionService).switchPersona('u-matheus');
    expect(links()).not.toContain('/quality');
    expect(links()).toContain('/workflow');
  });

  it('exibe o módulo para Sócio • Gerente', () => {
    TestBed.inject(SessionService).switchPersona('u-carlos');
    expect(links()).toContain('/quality');
  });

  it('recolhida: sem títulos de grupo, com nome acessível e indicação de restrição', () => {
    TestBed.inject(SessionService).switchPersona('u-carlos');
    const fixture = TestBed.createComponent(Sidebar);
    fixture.componentRef.setInput('collapsed', true);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.section-label')).toBeNull();
    expect(host.querySelector('.nav-label')).toBeNull();
    const quality = host.querySelector('a.nav-link[href="/quality"]');
    expect(quality?.getAttribute('aria-label')).toBe('Qualidade & Processos (restrito a Sócios)');
    expect(host.querySelector('a.nav-link[href="/workflow"]')?.getAttribute('aria-label')).toBe(
      'Quadro',
    );
  });

  it('destaca a rota ativa, inclusive em rotas aninhadas', async () => {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/workpapers/PTA-REC-001');
    await fixture.whenStable();
    const active = (fixture.nativeElement as HTMLElement).querySelectorAll('a.nav-link.active');
    expect(active.length).toBe(1);
    expect(active[0].getAttribute('href')).toBe('/workpapers');
    expect(active[0].getAttribute('aria-current')).toBe('page');
  });
});
