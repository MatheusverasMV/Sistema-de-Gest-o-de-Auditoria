import { Component } from '@angular/core';
import { PlaceholderPage } from '../../shared/ui/placeholder-page/placeholder-page';

@Component({
  selector: 'sga-documents-page',
  imports: [PlaceholderPage],
  template: `
    <sga-placeholder-page
      heading="Documentos"
      subheading="Repositório central de documentos recebidos dos clientes e evidências de auditoria."
      icon="folder-open"
      emptyHeading="Repositório de documentos em construção"
      emptyDescription="Hoje as evidências ficam anexadas diretamente aos PTAs. Esta área reunirá todos os arquivos por trabalho e cliente."
      [planned]="planned"
    />
  `,
})
export default class DocumentsPage {
  protected readonly planned = [
    'Solicitações de documentos (PBC) com prazos e status',
    'Versionamento e trilha de auditoria de arquivos',
    'Vínculo de um mesmo documento a múltiplos PTAs',
    'Políticas de retenção conforme NBC PA 01',
  ];
}
