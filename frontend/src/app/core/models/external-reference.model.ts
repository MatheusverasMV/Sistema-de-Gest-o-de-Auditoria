import { EntityType } from './entity.model';

/** Plataformas externas que podem originar identificadores. Hoje, apenas o Trello (ainda não conectado). */
export type ExternalProvider = 'trello';

export type ExternalEntityType = 'board' | 'list' | 'card' | 'member';

/** Entidades internas que aceitam vínculo externo. */
export type InternalEntityType = Extract<
  EntityType,
  'engagement' | 'workpaper' | 'task' | 'document_request' | 'board' | 'board_card' | 'user'
>;

/**
 * Vínculo explícito entre um identificador externo e uma entidade do SGA.
 *
 * Nenhum vínculo é presumido: um cartão do Trello pode representar um PTA, uma tarefa,
 * uma solicitação documental ou só um cartão do quadro — ou não ter vínculo algum.
 * A chave (provider, externalEntityType, externalEntityId) é única; uma entidade interna
 * pode ter mais de uma referência externa.
 */
export interface ExternalReference {
  readonly id: string;
  readonly provider: ExternalProvider;
  readonly externalEntityType: ExternalEntityType;
  readonly externalEntityId: string;
  readonly internalEntityType: InternalEntityType;
  readonly internalEntityId: string;
  /** Última sincronização confirmada com a origem (ISO 8601). */
  readonly syncedAt?: string;
}

/** Combinações de tipo externo → interno aceitas. Qualquer outra é rejeitada na validação. */
export const ALLOWED_EXTERNAL_MAPPINGS: Readonly<
  Record<ExternalEntityType, readonly InternalEntityType[]>
> = {
  board: ['engagement', 'board'],
  // Listas do Trello não têm entidade própria no SGA; ficam para o adaptador (colunas).
  list: [],
  card: ['workpaper', 'task', 'document_request', 'board_card'],
  member: ['user'],
};
