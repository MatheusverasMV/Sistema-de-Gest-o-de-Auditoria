import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockRepositories } from '../../core/data/mock/mock-repositories';
import { PeopleService } from '../../core/services/people.service';
import { Topbar } from './topbar';

describe('Topbar — controles globais', () => {
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Topbar],
      providers: [provideRouter([]), provideMockRepositories()],
    });
    await TestBed.inject(PeopleService).load();
  });

  it('o botão de menu descreve o estado da sidebar', () => {
    const fixture = TestBed.createComponent(Topbar);
    fixture.detectChanges();
    const toggle = (fixture.nativeElement as HTMLElement).querySelector('button.btn--icon')!;
    expect(toggle.getAttribute('aria-label')).toBe('Recolher menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    fixture.componentRef.setInput('sidebarCollapsed', true);
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-label')).toBe('Expandir menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('mantém busca, notificações e menu do usuário', async () => {
    const fixture = TestBed.createComponent(Topbar);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('form[role="search"] input[type="search"]')).not.toBeNull();
    expect(host.querySelector('.notif-trigger')?.getAttribute('aria-label')).toMatch(
      /^Notificações, \d+ não lidas$/,
    );
    expect(host.querySelector('.user-trigger .user-name')?.textContent?.trim()).toBeTruthy();
  });
});
