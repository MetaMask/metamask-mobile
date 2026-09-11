import {
  MarketCategory,
  MARKET_CATEGORIES,
  type MarketTypeFilter,
  type PerpsMarketData,
} from '@metamask/perps-controller';

/**
 * HIP-3 filter keys — data-model categories that map 1:1 to a HIP-3
 * `marketType` value. Derived from the controller's MARKET_CATEGORIES
 * constant so it stays in sync when new categories are added upstream.
 *
 * Excludes 'crypto' (main DEX, not HIP-3) and 'memecoin' (a derived
 * category — see `filterMarketsByCategory`).
 */
export const HIP3_FILTER_KEYS: ReadonlySet<MarketTypeFilter> = new Set(
  MARKET_CATEGORIES.filter(
    (c) => c !== MarketCategory.CryptoCurrency && c !== MarketCategory.Memecoin,
  ),
);

/**
 * Preferred display order for product categories.
 * Categories present in market data but missing from this list are
 * appended at the end in discovery order.
 */
export const CATEGORY_DISPLAY_ORDER: Exclude<MarketTypeFilter, 'all'>[] = [
  'crypto',
  'memecoin',
  'stock',
  'pre-ipo',
  'forex',
  'commodity',
  'index',
  'etf',
];

/**
 * Type guard: returns true when the value is a known HIP-3 MarketTypeFilter.
 */
export function isHip3Filter(
  value: string | undefined,
): value is MarketTypeFilter {
  return !!value && HIP3_FILTER_KEYS.has(value as MarketTypeFilter);
}

/**
 * Normalise a MarketTypeFilter value for use in translation keys and
 * analytics properties by replacing hyphens with underscores
 * (e.g. `"pre-ipo"` → `"pre_ipo"`).
 */
export function normalizeFilterKey(filter: string): string {
  return filter.replace(/-/g, '_');
}

/**
 * Filters markets by the active product category filter.
 *
 * - `'all'`: no filtering.
 * - `'crypto'`: non-HIP3 markets (main DEX).
 * - `'memecoin'`: non-HIP3 markets carrying the `'memecoin'` tag. Overlaps
 * with `'crypto'` by design — memecoins appear under both pills.
 * - `'new'`: uncategorized HIP-3 markets flagged as new.
 * - Any other {@link MarketTypeFilter}: HIP-3 markets whose `marketType` matches the filter exactly.
 */
export function filterMarketsByCategory<
  T extends Pick<
    PerpsMarketData,
    'isHip3' | 'isNewMarket' | 'marketType' | 'tags'
  >,
>(markets: T[], filter: MarketTypeFilter): T[] {
  if (filter === 'all') {
    return markets;
  }

  if (filter === 'crypto') {
    return markets.filter((market) => !market.isHip3);
  }

  if (filter === 'memecoin') {
    return markets.filter(
      (market) => !market.isHip3 && !!market.tags?.includes('memecoin'),
    );
  }

  if (filter === 'new') {
    return markets.filter((market) => market.isNewMarket);
  }

  return markets.filter((market) => market.marketType === filter);
}
