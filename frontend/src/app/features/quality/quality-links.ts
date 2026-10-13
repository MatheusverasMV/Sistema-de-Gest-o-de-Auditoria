import { boardOfEngagement, EntityCatalog, resolveEntity } from '../../core/data/entity-catalog';
import { EntityLink, ObservationContext } from '../../core/models';

/**
 * Liga o contexto de uma observação estatística às entidades operacionais do catálogo.
 * Só oferece navegação quando a entidade existe e tem tela; o restante é exibido como
 * referência, trabalho histórico ou vínculo não identificado — nunca como link quebrado.
 */

export type StepState =
  /** Entidade operacional navegável. */
  | 'linked'
  /** Entidade existente, sem tela própria (cliente, área). */
  | 'reference'
  /** Trabalho conhecido só pelo histórico estatístico. */
  | 'historical'
  /** Código informado pela fonte sem entidade correspondente, ou id inexistente. */
  | 'unlinked';

export interface OperationalStep {
  readonly label: string;
  readonly value: string;
  readonly state: StepState;
  readonly link?: EntityLink;
  readonly linkLabel?: string;
  readonly note?: string;
}

export interface OperationalLinks {
  readonly steps: readonly OperationalStep[];
  /** Há ao menos um registro operacional navegável a partir da observação. */
  readonly hasOperationalLink: boolean;
}

export const UNLINKED_NOTE = 'Vínculo operacional não identificado.';
const HISTORICAL_NOTE = 'Trabalho histórico, sem registro operacional no protótipo.';

/**
 * @param aggregated pontos de cartas p/u: o contexto é o segmento com maior concentração
 *   no período, não o "dono" do ponto.
 */
export function resolveOperationalLinks(
  catalog: EntityCatalog,
  context: ObservationContext | undefined,
  aggregated: boolean,
): OperationalLinks {
  if (!context) {
    return { steps: [], hasOperationalLink: false };
  }
  const steps: OperationalStep[] = [];

  if (context.clientId || context.clientName) {
    const client = resolveEntity(catalog, { type: 'client', id: context.clientId });
    steps.push(
      client.status === 'resolved'
        ? {
            label: aggregated ? 'Cliente com maior concentração' : 'Cliente',
            value: client.label,
            state: 'reference',
          }
        : {
            label: 'Cliente',
            value: context.clientName ?? context.clientId ?? '—',
            state: 'unlinked',
            note: UNLINKED_NOTE,
          },
    );
  }

  if (context.engagementId || context.engagementName) {
    const engagement = resolveEntity(catalog, { type: 'engagement', id: context.engagementId });
    const value = context.engagementName ?? context.engagementId ?? '—';
    if (engagement.status !== 'resolved') {
      steps.push({ label: 'Trabalho', value, state: 'unlinked', note: UNLINKED_NOTE });
    } else if (engagement.recordKind === 'historical') {
      steps.push({ label: 'Trabalho', value, state: 'historical', note: HISTORICAL_NOTE });
    } else {
      steps.push({
        label: 'Trabalho',
        value,
        state: 'linked',
        link: engagement.link ?? undefined,
        linkLabel: 'Abrir trabalho',
      });
      const board = boardOfEngagement(catalog, engagement.entityId);
      if (board) {
        const resolution = resolveEntity(catalog, { type: 'board', id: board.id });
        if (resolution.status === 'resolved' && resolution.link) {
          steps.push({
            label: 'Quadro Kanban',
            value: board.title,
            state: 'linked',
            link: resolution.link,
            linkLabel: 'Abrir quadro',
          });
        }
      }
    }
  }

  if (context.auditArea) {
    const area = resolveEntity(catalog, { type: 'audit_area', id: context.auditArea });
    steps.push(
      area.status === 'resolved'
        ? { label: 'Área', value: area.label, state: 'reference' }
        : { label: 'Área', value: context.auditArea, state: 'unlinked', note: UNLINKED_NOTE },
    );
  }

  if (context.workpaperId) {
    const workpaper = resolveEntity(catalog, { type: 'workpaper', id: context.workpaperId });
    steps.push(
      workpaper.status === 'resolved'
        ? {
            label: 'PTA',
            value: workpaper.label,
            state: 'linked',
            link: workpaper.link ?? undefined,
            linkLabel: 'Abrir PTA',
          }
        : { label: 'PTA', value: context.workpaperId, state: 'unlinked', note: UNLINKED_NOTE },
    );
  } else if (context.workpaperCode) {
    steps.push({
      label: 'PTA (código na origem)',
      value: context.workpaperCode,
      state: 'unlinked',
      note: UNLINKED_NOTE,
    });
  }

  if (context.eventId || context.eventCode) {
    // Ainda não há histórico de eventos navegável (Incremento 02).
    steps.push({
      label: context.eventId ? 'Evento' : 'Evento (código na origem)',
      value: context.eventId ?? context.eventCode!,
      state: 'unlinked',
      note: UNLINKED_NOTE,
    });
  }

  return { steps, hasOperationalLink: steps.some((s) => s.state === 'linked') };
}
