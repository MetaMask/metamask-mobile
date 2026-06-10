import { type MarketTypeFilter } from '@metamask/perps-controller';

/**
 * HIP-3 filter keys (everything except the UI-only 'all', 'crypto', 'new').
 * In v8+ MarketTypeFilter values equal MarketCategory enum values,
 * so no mapping is needed — use this set for membership checks only.
 */
export const HIP3_FILTER_KEYS: ReadonlySet<MarketTypeFilter> =
  new Set<MarketTypeFilter>([
    'stock',
    'pre-ipo',
    'index',
    'etf',
    'commodity',
    'forex',
  ]);

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
