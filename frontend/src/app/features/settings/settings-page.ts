import { Component } from '@angular/core';
import { PlaceholderPage } from '../../shared/ui/placeholder-page/placeholder-page';

@Component({
  selector: 'sga-settings-page',
  imports: [PlaceholderPage],
  template: `
    <sga-placeholder-page
      heading="Configurações"
      subheading="Preferências da firma, usuários, perfis e modelos de PTA."
      icon="settings"
      emptyHeading="Configurações indisponíveis no protótipo"
      emptyDescription="Para demonstrar diferentes perfis, use o seletor de persona no menu do usuário, no canto superior direito."
      [planned]="planned"
    />
  `,
})
export default class SettingsPage {
  protected readonly planned = [
    'Gestão de usuários, cargos e atribuição de Gerente a Sócios',
    'Modelos de PTA por área e ciclo',
    'Parâmetros padrão de materialidade e amostragem',
    'Integração com autenticação corporativa (SSO)',
  ];
}
