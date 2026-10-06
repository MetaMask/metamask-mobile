import type { CollectorCryptPack } from '../../providers/collector-crypt/types';
import type { GachaHomeTab } from '../../types/navigation';

const COLLECTION_ORDER = new Map([
  ['Pokemon', 0],
  ['One Piece', 1],
  ['Sports', 2],
  ['Others', 3],
]);

/** Available filters in display order; new categories follow alphabetically. */
export const getPackCollections = (packs: CollectorCryptPack[]): string[] =>
  [
    ...new Set(packs.flatMap((pack) => (pack.category ? [pack.category] : []))),
  ].sort(
    (a, b) =>
      (COLLECTION_ORDER.get(a) ?? COLLECTION_ORDER.size) -
        (COLLECTION_ORDER.get(b) ?? COLLECTION_ORDER.size) ||
      a.localeCompare(b),
  );

/** Filter by collection, then order by price without changing the query cache. */
export const getVisiblePacks = (
  packs: CollectorCryptPack[],
  collection: string,
): CollectorCryptPack[] =>
  packs
    .filter((pack) => !collection || pack.category === collection)
    .sort((a, b) => a.price - b.price);

export interface CardsAvailability {
  hasCards: boolean;
  /** First sync running without cached cards. */
  isLoading: boolean;
  /** Last sync failed: the cards tab shows the error and its retry. */
  hasSyncError: boolean;
}

/**
 * Product rule: "My cards" is only reachable when the account has a card.
 * While the first sync is running (skeleton) or after it failed (error with
 * retry) the tab stays reachable, so a failure is never hidden.
 */
export const shouldStayOnPacks = ({
  hasCards,
  isLoading,
  hasSyncError,
}: CardsAvailability): boolean => !hasCards && !isLoading && !hasSyncError;

/** Tab to display: a "cards" request falls back to Packs when it is unreachable. */
export const getVisibleTab = ({
  tab,
  ...availability
}: CardsAvailability & { tab: GachaHomeTab }): GachaHomeTab =>
  tab === 'cards' && shouldStayOnPacks(availability) ? 'packs' : tab;
