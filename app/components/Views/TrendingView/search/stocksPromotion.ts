import type { TrendingAsset } from '@metamask/assets-controllers';
import type { SearchFeedSection } from './useExploreSearch';

/**
 * Normalizes a search query or RWA ticker for exact-match comparison.
 * Ignores case, spaces, and a single leading `$`.
 */
export const normalizeStockTicker = (value: string): string =>
  value.trim().replace(/^\$/, '').replace(/\s+/g, '').toLowerCase();

/**
 * Normalizes a search query or RWA asset name for exact-match comparison.
 * Trims, collapses internal whitespace, and lowercases.
 */
export const normalizeStockName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Strips common issuer suffixes from tokenized stock names (e.g.
 * `"Tesla (Ondo Tokenized)"` → `"Tesla"`, `"Microsoft xStock"` → `"Microsoft"`)
 * so exact company-name queries still match issuer-wrapped RWA names.
 */
const stripRwaNameIssuerSuffix = (name: string): string =>
  name
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+xstock$/i, '')
    .trim();

/**
 * Strips whitespace and an optional leading `$` from a query before sending it
 * to the RWA search endpoint (matching `useTrendingSearch` behavior for `$TSLA`).
 */
export const stripLeadingDollarQuery = (query?: string): string =>
  query?.trim().replace(/^\$/, '').trim() ?? '';

/**
 * Returns true when `query` exactly matches either `rwaData.ticker` or the
 * RWA asset `name` (full or issuer-stripped) of at least one item in a loaded,
 * non-empty Stocks section.
 *
 * Returns false while Stocks is loading, when it has no results, when the
 * query is empty after normalization, or when the item has no `rwaData`.
 */
export const shouldPromoteStocksSection = (
  query: string,
  stocksSection: Pick<SearchFeedSection, 'items' | 'isLoading'> | undefined,
): boolean => {
  if (
    !stocksSection ||
    stocksSection.isLoading ||
    stocksSection.items.length === 0
  ) {
    return false;
  }

  const normalizedTickerQuery = normalizeStockTicker(query);
  const normalizedNameQuery = normalizeStockName(query);
  if (!normalizedTickerQuery && !normalizedNameQuery) {
    return false;
  }

  return stocksSection.items.some((item) => {
    const asset = item as Partial<TrendingAsset> | null | undefined;
    if (!asset?.rwaData) {
      return false;
    }

    const ticker = asset.rwaData.ticker;
    if (
      normalizedTickerQuery &&
      typeof ticker === 'string' &&
      normalizeStockTicker(ticker) === normalizedTickerQuery
    ) {
      return true;
    }

    const name = asset.name;
    if (normalizedNameQuery && typeof name === 'string') {
      if (normalizeStockName(name) === normalizedNameQuery) {
        return true;
      }
      const strippedName = normalizeStockName(stripRwaNameIssuerSuffix(name));
      if (strippedName && strippedName === normalizedNameQuery) {
        return true;
      }
    }

    return false;
  });
};

/**
 * Moves the `stocks` section to the top (index 0) when `shouldPromote` is true.
 * Preserves the original array reference when no reorder is needed.
 */
export const orderExploreSearchSections = (
  sections: SearchFeedSection[],
  shouldPromote: boolean,
): SearchFeedSection[] => {
  if (!shouldPromote) {
    return sections;
  }

  const stocksIndex = sections.findIndex((s) => s.feedId === 'stocks');
  if (stocksIndex <= 0) {
    return sections;
  }

  return [
    sections[stocksIndex],
    ...sections.slice(0, stocksIndex),
    ...sections.slice(stocksIndex + 1),
  ];
};
