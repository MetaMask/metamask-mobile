import {
  MarketCategory,
  type MarketType,
  type MarketTypeFilter,
} from '@metamask/perps-controller';

/**
 * Explicit mapping from MarketTypeFilter → MarketCategory enum value.
 *
 * 'crypto' is excluded because crypto markets are identified by `!isHip3`,
 * not by a MarketCategory value. 'all' and 'new' are UI-only sentinels.
 */
const FILTER_TO_MARKET_TYPE = new Map<MarketTypeFilter, MarketType>([
  ['stock', MarketCategory.Stock],
  ['pre-ipo', MarketCategory.PreIpo],
  ['index', MarketCategory.Index],
  ['etf', MarketCategory.Etf],
  ['commodity', MarketCategory.Commodity],
  ['forex', MarketCategory.Forex],
]);

/** Reverse lookup: MarketCategory enum value → MarketTypeFilter. */
const MARKET_TYPE_TO_FILTER = new Map<string, MarketTypeFilter>(
  [...FILTER_TO_MARKET_TYPE.entries()].map(([filter, type]) => [type, filter]),
);

/**
 * Get the MarketType (data-model value on PerpsMarketData.marketType) for a
 * given MarketTypeFilter.  Returns `undefined` for 'all', 'new', and 'crypto'
 * which don't map to a single MarketType value.
 */
export function getMarketTypeForFilter(
  filter: MarketTypeFilter,
): MarketType | undefined {
  return FILTER_TO_MARKET_TYPE.get(filter);
}

/**
 * Get the MarketTypeFilter for a given MarketType value (from
 * PerpsMarketData.marketType). Useful for building category counts
 * from raw market data without a switch statement.
 */
export function getFilterForMarketType(
  marketType: string,
): MarketTypeFilter | undefined {
  return MARKET_TYPE_TO_FILTER.get(marketType);
}

/**
 * Preferred display order for product categories.
 * Categories present in market data but missing from this list are
 * appended at the end in discovery order.
 */
export const CATEGORY_DISPLAY_ORDER: Exclude<MarketTypeFilter, 'all'>[] = [
  'crypto',
  'stock',
  'pre-ipo',
  'forex',
  'commodity',
  'index',
  'etf',
];

/**
 * Normalise a MarketTypeFilter value for use in translation keys and
 * analytics properties by replacing hyphens with underscores
 * (e.g. `"pre-ipo"` → `"pre_ipo"`).
 */
export function normalizeFilterKey(filter: string): string {
  return filter.replace(/-/g, '_');
}
