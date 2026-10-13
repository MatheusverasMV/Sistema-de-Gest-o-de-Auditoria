import {
  ALLOWED_EXTERNAL_MAPPINGS,
  EntityResolution,
  ExternalEntityType,
  ExternalProvider,
  ExternalReference,
} from '../models';
import { EntityCatalog, resolveEntity } from './entity-catalog';

/*
 * Vínculos com plataformas externas (Trello no futuro). Funções puras: o adaptador que
 * buscar dados na API ainda não existe e, quando existir, só produzirá referências e
 * eventos normalizados — o motor estatístico não conhece o Trello.
 */

export interface ExternalKey {
  readonly provider: ExternalProvider;
  readonly externalEntityType: ExternalEntityType;
  readonly externalEntityId: string;
}

export function externalKey(ref: ExternalKey): string {
  return `${ref.provider}|${ref.externalEntityType}|${ref.externalEntityId}`;
}

/** Duas referências com a mesma chave externa apontando para entidades internas diferentes. */
export class ExternalReferenceConflictError extends Error {
  constructor(
    readonly key: string,
    readonly references: readonly ExternalReference[],
  ) {
    super(
      `Referência externa ${key} associada a entidades internas diferentes: ${references
        .map((r) => `${r.internalEntityType}:${r.internalEntityId}`)
        .join(', ')}.`,
    );
    this.name = 'ExternalReferenceConflictError';
  }
}

/**
 * Indexa referências pela chave externa. Duplicatas idênticas (mesmo alvo) são aceitas;
 * duplicatas conflitantes lançam erro — nunca são resolvidas silenciosamente.
 */
export function indexExternalReferences(
  references: readonly ExternalReference[],
): ReadonlyMap<string, ExternalReference> {
  const index = new Map<string, ExternalReference>();
  for (const reference of references) {
    const key = externalKey(reference);
    const existing = index.get(key);
    if (existing && !sameTarget(existing, reference)) {
      throw new ExternalReferenceConflictError(key, [existing, reference]);
    }
    index.set(key, existing ?? reference);
  }
  return index;
}

export type ExternalResolution =
  | {
      readonly status: 'resolved';
      readonly reference: ExternalReference;
      readonly entity: EntityResolution & { status: 'resolved' };
    }
  /** Nenhum vínculo cadastrado para o id externo. */
  | { readonly status: 'unknown'; readonly key: string }
  /** Vínculo cadastrado, mas a entidade interna não existe (ou o tipo não é aceito). */
  | {
      readonly status: 'invalid';
      readonly reference: ExternalReference;
      readonly reason: 'missing_internal' | 'incompatible_type';
    };

/** Externo → interno. Lança ExternalReferenceConflictError se houver vínculos conflitantes. */
export function resolveExternalReference(
  references: readonly ExternalReference[],
  catalog: EntityCatalog,
  key: ExternalKey,
): ExternalResolution {
  const reference = indexExternalReferences(references).get(externalKey(key));
  if (!reference) {
    return { status: 'unknown', key: externalKey(key) };
  }
  if (
    !ALLOWED_EXTERNAL_MAPPINGS[reference.externalEntityType].includes(reference.internalEntityType)
  ) {
    return { status: 'invalid', reference, reason: 'incompatible_type' };
  }
  const entity = resolveEntity(catalog, {
    type: reference.internalEntityType,
    id: reference.internalEntityId,
  });
  return entity.status === 'resolved'
    ? { status: 'resolved', reference, entity }
    : { status: 'invalid', reference, reason: 'missing_internal' };
}

/** Interno → externos: uma entidade pode ter várias referências legítimas. */
export function referencesOf(
  references: readonly ExternalReference[],
  internal: { readonly type: ExternalReference['internalEntityType']; readonly id: string },
): ExternalReference[] {
  return references.filter(
    (r) => r.internalEntityType === internal.type && r.internalEntityId === internal.id,
  );
}

export type ExternalReferenceIssueCode =
  | 'conflicting_duplicate'
  | 'redundant_duplicate'
  | 'duplicate_id'
  | 'missing_internal'
  | 'incompatible_type';

export interface ExternalReferenceIssue {
  readonly code: ExternalReferenceIssueCode;
  readonly referenceIds: readonly string[];
  readonly message: string;
}

/** Diagnóstico completo, sem lançar erro (para relatórios e testes de integridade). */
export function validateExternalReferences(
  references: readonly ExternalReference[],
  catalog: EntityCatalog,
): ExternalReferenceIssue[] {
  const issues: ExternalReferenceIssue[] = [];
  const byKey = new Map<string, ExternalReference[]>();
  const byId = new Map<string, number>();
  for (const reference of references) {
    const key = externalKey(reference);
    byKey.set(key, [...(byKey.get(key) ?? []), reference]);
    byId.set(reference.id, (byId.get(reference.id) ?? 0) + 1);
  }
  for (const [id, count] of byId) {
    if (count > 1) {
      issues.push({ code: 'duplicate_id', referenceIds: [id], message: `Id ${id} repetido.` });
    }
  }
  for (const [key, group] of byKey) {
    if (group.length < 2) continue;
    const conflicting = group.some((r) => !sameTarget(r, group[0]));
    issues.push({
      code: conflicting ? 'conflicting_duplicate' : 'redundant_duplicate',
      referenceIds: group.map((r) => r.id),
      message: conflicting
        ? `${key} aponta para entidades internas diferentes.`
        : `${key} cadastrado mais de uma vez para o mesmo alvo.`,
    });
  }
  for (const reference of references) {
    if (
      !ALLOWED_EXTERNAL_MAPPINGS[reference.externalEntityType].includes(
        reference.internalEntityType,
      )
    ) {
      issues.push({
        code: 'incompatible_type',
        referenceIds: [reference.id],
        message: `${reference.externalEntityType} não pode representar ${reference.internalEntityType}.`,
      });
      continue;
    }
    const entity = resolveEntity(catalog, {
      type: reference.internalEntityType,
      id: reference.internalEntityId,
    });
    if (entity.status !== 'resolved') {
      issues.push({
        code: 'missing_internal',
        referenceIds: [reference.id],
        message: `${reference.internalEntityType} ${reference.internalEntityId} inexistente.`,
      });
    }
  }
  return issues;
}

function sameTarget(a: ExternalReference, b: ExternalReference): boolean {
  return a.internalEntityType === b.internalEntityType && a.internalEntityId === b.internalEntityId;
}
