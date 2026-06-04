import {
  MarketCategory,
  MARKET_CATEGORIES,
  type MarketType,
  type MarketTypeFilter,
} from '@metamask/perps-controller';

/**
 * Reverse lookup from MarketCategory enum value to the corresponding
 * MARKET_CATEGORIES entry (which is also the MarketTypeFilter value).
 *
 * Built once from the MarketCategory enum so that adding a new category
 * in @metamask/perps-controller automatically propagates here without
 * requiring a manual mapping update.
 */
const MARKET_TYPE_TO_FILTER = new Map<string, MarketTypeFilter>(
  Object.values(MarketCategory).map((enumValue, index) => [
    enumValue,
    MARKET_CATEGORIES[index],
  ]),
);

/**
 * Forward lookup from MarketTypeFilter to MarketType (MarketCategory value).
 * Excludes 'crypto' (identified by `!isHip3`), 'all', and 'new' (UI-only sentinels).
 */
const categoryValues = Object.values(MarketCategory);
const FILTER_TO_MARKET_TYPE = new Map<MarketTypeFilter, MarketType>(
  MARKET_CATEGORIES.filter((f) => f !== 'crypto').map((filter) => {
    const idx = MARKET_CATEGORIES.indexOf(filter);
    return [filter, categoryValues[idx]];
  }),
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
