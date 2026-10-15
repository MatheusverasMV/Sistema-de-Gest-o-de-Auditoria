import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockRepositories } from '../../core/data/mock/mock-repositories';
import { BoardCard } from '../../core/models';
import { PeopleService } from '../../core/services/people.service';
import { BoardCardView } from './board-card';

const CARD: BoardCard = {
  id: 'c-test',
  code: 'PTA-REC-001',
  title: 'Teste de Receita',
  type: 'workpaper',
  assigneeId: 'u-ana',
  priority: 'high',
  dueDate: '2026-10-08',
  tags: ['Receita', 'PTA'],
  engagementId: 'eng-alfa-2026',
  workpaperId: 'PTA-REC-001',
};

describe('Cartão do Kanban — composição da Fase 4', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [BoardCardView],
      providers: [provideRouter([]), provideMockRepositories()],
    });
    await TestBed.inject(PeopleService).load();
  });

  function render(positionDiffers: boolean) {
    const fixture = TestBed.createComponent(BoardCardView);
    fixture.componentRef.setInput('card', CARD);
    fixture.componentRef.setInput('columnId', 'done');
    fixture.componentRef.setInput('formalStatus', 'awaiting_review');
    fixture.componentRef.setInput('positionDiffers', positionDiffers);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mantém título, tags em texto, prioridade sem alarme e coluna no nome acessível', () => {
    const host = render(false);
    expect(host.querySelector('.title')?.textContent).toBe('Teste de Receita');
    expect(host.querySelector('.tags')?.textContent).toBe('Receita · PTA');
    expect(host.querySelectorAll('sga-status-badge').length).toBe(1);
    expect(host.querySelector('.badge--danger')).toBeNull();
    expect(host.querySelector('button.surface')?.getAttribute('aria-label')).toContain(
      'Coluna: Concluído',
    );
  });

  it('status formal do PTA sempre visível; destaque só quando diverge da coluna', () => {
    const aligned = render(false);
    expect(aligned.querySelector('.formal')?.textContent).toContain('PTA: Aguardando revisão');
    expect(aligned.querySelector('.formal--differs')).toBeNull();

    const differs = render(true);
    expect(differs.querySelector('.formal--differs')?.textContent).toContain('difere da coluna');
  });
});
