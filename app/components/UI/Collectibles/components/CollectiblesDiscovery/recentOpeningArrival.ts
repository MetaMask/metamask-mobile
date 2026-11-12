import type { CollectiblesOpening } from '../../types';

const MAX_TRACKED_IDS = 100;
export interface RecentOpeningArrival {
  knownIds: string[];
  newestAt: number;
  arrivingId?: string;
}

/** Replit PackPullActivity only animates a newly inserted first event, never its initial history. */
export function initialOpeningArrival(
  cards: CollectiblesOpening[],
): RecentOpeningArrival {
  return {
    knownIds: cards.map((card) => card.id).slice(0, MAX_TRACKED_IDS),
    newestAt: Math.max(0, ...cards.map((card) => card.openedAt)),
  };
}

export function advanceOpeningArrival(
  current: RecentOpeningArrival,
  cards: CollectiblesOpening[],
  active: boolean,
): RecentOpeningArrival {
  const first = cards[0];
  const isNew =
    first &&
    !current.knownIds.includes(first.id) &&
    first.openedAt >= current.newestAt;
  const arrivingId = active
    ? isNew
      ? first.id
      : first?.id === current.arrivingId
        ? current.arrivingId
        : undefined
    : undefined;
  const knownIds = [
    ...new Set([...cards.map((card) => card.id), ...current.knownIds]),
  ].slice(0, MAX_TRACKED_IDS);
  const newestAt = Math.max(
    current.newestAt,
    ...cards.map((card) => card.openedAt),
  );
  if (
    arrivingId === current.arrivingId &&
    newestAt === current.newestAt &&
    knownIds.length === current.knownIds.length &&
    knownIds.every((id, index) => id === current.knownIds[index])
  )
    return current;
  return { knownIds, newestAt, arrivingId };
}
