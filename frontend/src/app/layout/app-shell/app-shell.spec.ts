import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideMockRepositories } from '../../core/data/mock/mock-repositories';
import { PeopleService } from '../../core/services/people.service';
import { AppShell } from './app-shell';

@Component({ template: '' })
class Blank {}

describe('App Shell — navegação desktop e gaveta mobile', () => {
  const originalMatchMedia = window.matchMedia;

  function useViewport(mobile: boolean): void {
    window.matchMedia = ((query: string) => ({
      matches: mobile && query.includes('max-width: 767px'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
  }

  async function render(mobile: boolean) {
    useViewport(mobile);
    TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [provideRouter([{ path: '**', component: Blank }]), provideMockRepositories()],
    });
    await TestBed.inject(PeopleService).load();
    const fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const toggle = () => {
      host.querySelector<HTMLButtonElement>('sga-topbar button.btn--icon')!.click();
      fixture.detectChanges();
    };
    const isOpen = () => host.querySelector('sga-sidebar')!.classList.contains('open');
    return { fixture, host, toggle, isOpen };
  }

  beforeEach(() => localStorage.clear());
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.body.style.overflow = '';
  });

  it('desktop: o botão recolhe a sidebar, sem gaveta nem fundo', async () => {
    const { host, toggle, isOpen } = await render(false);
    const sidebar = host.querySelector('sga-sidebar')!;
    const wasCollapsed = sidebar.classList.contains('collapsed');
    toggle();
    expect(sidebar.classList.contains('collapsed')).toBe(!wasCollapsed);
    expect(isOpen()).toBe(false);
    expect(host.querySelector('.nav-backdrop')).toBeNull();
    expect(sidebar.querySelector('button.close')).toBeNull();
  });

  it('mobile: abre a gaveta com fundo, conteúdo inerte e estado no botão', async () => {
    const { host, toggle, isOpen } = await render(true);
    const button = host.querySelector('sga-topbar button.btn--icon')!;
    expect(button.getAttribute('aria-label')).toBe('Abrir menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe('main-navigation');

    toggle();
    expect(isOpen()).toBe(true);
    expect(host.querySelector('.nav-backdrop')).not.toBeNull();
    expect(host.querySelector('.column')!.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(button.getAttribute('aria-label')).toBe('Fechar menu');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    // Mesma navegação da sidebar desktop, com rótulos visíveis (não recolhida).
    expect(host.querySelector('sga-sidebar')!.classList.contains('collapsed')).toBe(false);
    expect(host.querySelectorAll('sga-sidebar a.nav-link').length).toBeGreaterThan(0);
  });

  it('mobile: fecha com Esc, fundo, botão de fechar e ao escolher uma rota', async () => {
    const { fixture, host, toggle, isOpen } = await render(true);

    toggle();
    host
      .querySelector('sga-sidebar')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');

    toggle();
    host.querySelector<HTMLElement>('.nav-backdrop')!.click();
    fixture.detectChanges();
    expect(isOpen()).toBe(false);

    toggle();
    host.querySelector<HTMLButtonElement>('sga-sidebar button.close')!.click();
    fixture.detectChanges();
    expect(isOpen()).toBe(false);

    toggle();
    await TestBed.inject(Router).navigateByUrl('/workflow');
    fixture.detectChanges();
    expect(isOpen()).toBe(false);
    expect(host.querySelector('.column')!.hasAttribute('inert')).toBe(false);
  });
});
