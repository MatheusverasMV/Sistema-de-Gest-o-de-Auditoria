import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SessionService } from '../../core/auth/session.service';
import { provideMockRepositories } from '../../core/data/mock/mock-repositories';
import { PeopleService } from '../../core/services/people.service';
import { Sidebar } from './sidebar';

describe('Sidebar — restrição de Qualidade & Processos', () => {
  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideRouter([]), provideMockRepositories()],
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
});
