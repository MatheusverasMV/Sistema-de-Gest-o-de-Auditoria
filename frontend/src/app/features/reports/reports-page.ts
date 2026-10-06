import { Component } from '@angular/core';
import { PlaceholderPage } from '../../shared/ui/placeholder-page/placeholder-page';

@Component({
  selector: 'sga-reports-page',
  imports: [PlaceholderPage],
  template: `
    <sga-placeholder-page
      heading="Relatórios"
      subheading="Relatórios do auditor, cartas de controle interno e relatórios gerenciais."
      icon="file-chart"
      emptyHeading="Nenhum relatório gerado ainda"
      emptyDescription="Os relatórios serão montados a partir das conclusões dos PTAs e dos ajustes registrados em cada trabalho."
      [planned]="planned"
    />
  `,
})
export default class ReportsPage {
  protected readonly planned = [
    'Minuta do relatório do auditor a partir de modelos NBC TA 700/705',
    'Carta de recomendações de controle interno',
    'Resumo de distorções corrigidas e não corrigidas',
    'Relatório gerencial de horas e andamento por trabalho',
  ];
}
