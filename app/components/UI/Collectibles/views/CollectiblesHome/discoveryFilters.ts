import type { CollectiblesCard, CollectiblesPack } from '../../types';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import {
  comparePackCategories,
  getPackDiscoveryGroup,
  packMatchesCategory,
} from './CollectiblesHome.utils';

export type PackSort = 'priceAsc' | 'priceDesc' | 'featured';
export type PackPriceRange = 'all' | 'under100' | '100to500' | 'over500';
export type CollectionSort = 'newest' | 'oldest' | 'valueDesc' | 'valueAsc';

/** Case and accent independent matching for pack/card searches. */
export const matchesSearch = (value: string, query: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/dragonball/gu, 'dragon ball')
    .includes(
      query
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/gu, '')
        .toLowerCase()
        .replace(/dragonball/gu, 'dragon ball')
        .trim(),
    );

/** Catalogue filtering does not mutate provider data or infer popularity. */
export const filterPacks = (
  packs: CollectiblesPack[],
  options: {
    category: string;
    query: string;
    range: PackPriceRange;
    sort: PackSort;
  },
) =>
  packs
    .filter(
      (pack) =>
        packMatchesCategory(pack, options.category) &&
        matchesSearch(
          `${pack.name} ${getCollectiblesPackArtwork(`pack_partner:${pack.code}`).name ?? ''} ${getPackDiscoveryGroup(pack)} ${pack.price}`,
          options.query,
        ) &&
        (options.range === 'all' ||
          (options.range === 'under100' && pack.price < 100) ||
          (options.range === '100to500' &&
            pack.price >= 100 &&
            pack.price <= 500) ||
          (options.range === 'over500' && pack.price > 500)),
    )
    .sort((left, right) => {
      if (options.sort === 'featured') {
        return (
          (left.menuOrder ?? Number.MAX_SAFE_INTEGER) -
            (right.menuOrder ?? Number.MAX_SAFE_INTEGER) ||
          left.price - right.price ||
          comparePackCategories(left, right)
        );
      }
      return (
        (left.price - right.price) * (options.sort === 'priceDesc' ? -1 : 1) ||
        comparePackCategories(left, right)
      );
    });

/** Unknown insured values sort last and never become fabricated zero values. */
export const sortCollection = (
  cards: CollectiblesCard[],
  sort: CollectionSort,
) =>
  [...cards].sort((left, right) => {
    if (sort === 'newest' || sort === 'oldest') {
      return (
        (left.acquiredAt - right.acquiredAt) * (sort === 'newest' ? -1 : 1)
      );
    }
    if (left.insuredValue === undefined)
      return right.insuredValue === undefined ? 0 : 1;
    if (right.insuredValue === undefined) return -1;
    return (
      (left.insuredValue - right.insuredValue) * (sort === 'valueDesc' ? -1 : 1)
    );
  });
