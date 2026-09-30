import type { GachaHomeTab } from '../../types/navigation';
import type { CollectorCryptPack } from '../../providers/collector-crypt/types';

/** Tab order of the home screen. */
export const HOME_TABS: readonly GachaHomeTab[] = ['packs', 'cards'];

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

/**
 * Product rule: "My cards" is only reachable when the account has a card.
 * While the first sync is running the tab stays reachable (skeleton).
 */
export const shouldStayOnPacks = ({
  hasCards,
  isLoading,
}: {
  hasCards: boolean;
  isLoading: boolean;
}): boolean => !hasCards && !isLoading;
