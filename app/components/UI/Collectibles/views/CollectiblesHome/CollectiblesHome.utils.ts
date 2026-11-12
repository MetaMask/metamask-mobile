import type { CollectiblesPack } from '../../types';
import { canonicalPackCategory } from '../../utils/packClassification';
import type { PackInsights } from '../../services/clients/CollectiblesApiClient';

// Source: Replit packCategories.ts. Only groups present in the live menu appear.
const COLLECTION_ORDER = [
  'Pokémon',
  'One Piece',
  'Sports',
  'Basketball',
  'Baseball',
  'Football',
  'Soccer',
  'Watches',
  'Riftbound',
  'Dragon Ball',
  'Anime',
  'Disney Lorcana',
];

export const getPackDiscoveryGroup = (pack: CollectiblesPack): string => {
  const category = canonicalPackCategory(
    pack.code,
    pack.category ?? undefined,
    pack.name,
  );
  return category === 'Dragon Ball Z'
    ? 'Dragon Ball'
    : (category ?? pack.category ?? '');
};

export const comparePackCategories = (
  left: CollectiblesPack,
  right: CollectiblesPack,
) => {
  const a = getPackDiscoveryGroup(left);
  const b = getPackDiscoveryGroup(right);
  const order = (category: string) => {
    const index = COLLECTION_ORDER.indexOf(category);
    return index < 0 ? COLLECTION_ORDER.length : index;
  };
  return order(a) - order(b) || a.localeCompare(b);
};

/** Accept legacy raw categories in saved entry intents, too. */
const LEGACY_CATEGORIES: Readonly<Record<string, string>> = {
  Pokemon: 'Pokémon',
  Watch: 'Watches',
  'Dragon Ball Z': 'Dragon Ball',
};
export const normalizePackCategory = (category: string) =>
  LEGACY_CATEGORIES[category] ?? category;

export const packMatchesCategory = (pack: CollectiblesPack, category: string) =>
  !category || getPackDiscoveryGroup(pack) === normalizePackCategory(category);

/** Available filters in display order; new categories follow alphabetically. */
export const getPackCollections = (packs: CollectiblesPack[]): string[] => [
  ...new Set(
    [...packs]
      .sort(comparePackCategories)
      .map(getPackDiscoveryGroup)
      .filter(Boolean),
  ),
];

/** Filter by collection, then order by price without changing the query cache. */
export const getVisiblePacks = (
  packs: CollectiblesPack[],
  collection: string,
): CollectiblesPack[] =>
  packs
    .filter((pack) => packMatchesCategory(pack, collection))
    .sort((a, b) => a.price - b.price || comparePackCategories(a, b));

/** Rank the supplied seven-day counts; Core falls back to the live price order. */
export const getPopularPacks = (
  packs: CollectiblesPack[],
  insights?: Record<string, PackInsights>,
) =>
  getVisiblePacks(packs, '').sort(
    (a, b) =>
      (insights?.[`pack_partner:${b.code}`]?.openedLast7d ?? 0) -
      (insights?.[`pack_partner:${a.code}`]?.openedLast7d ?? 0),
  );
