/** Entidades internas do SGA que podem ser referenciadas por outros módulos ou fontes externas. */
export type EntityType =
  | 'client'
  | 'engagement'
  | 'audit_area'
  | 'workpaper'
  | 'task'
  | 'board'
  | 'board_card'
  | 'user'
  | 'document_request';

export interface EntityRef {
  readonly type: EntityType;
  readonly id: string;
}

/** Destino navegável de uma entidade (formato do `routerLink`). */
export interface EntityLink {
  readonly commands: readonly string[];
  readonly queryParams?: Readonly<Record<string, string>>;
}

/**
 * - `operational`: registro completo no protótipo (tela própria quando houver rota).
 * - `historical`: identidade conhecida apenas pelo histórico estatístico; sem registro
 *   operacional, portanto sem navegação. Nunca é tratado como trabalho ativo.
 */
export type RecordKind = 'operational' | 'historical';

/**
 * Resultado da resolução de uma referência contra o catálogo canônico.
 * A resolução é sempre por identificador exato — nunca por semelhança de texto.
 */
export type EntityResolution =
  | {
      readonly status: 'resolved';
      readonly entityType: EntityType;
      readonly entityId: string;
      readonly label: string;
      readonly recordKind: RecordKind;
      /** null quando a entidade existe mas não tem tela de detalhe. */
      readonly link: EntityLink | null;
    }
  | {
      readonly status: 'unresolved';
      readonly entityType: EntityType;
      /** Identificador informado que não corresponde a nenhuma entidade. */
      readonly entityId?: string;
      /** `not_found`: o id não existe · `not_linked`: a origem não informou vínculo. */
      readonly reason: 'not_found' | 'not_linked';
    };
