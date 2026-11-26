import { useEffect, useMemo, useState } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { SearchFeedSection } from './useExploreSearch';

/**
 * Maximum time to hold ready non-stocks sections in skeleton state while
 * waiting for the Stocks request to settle so promotion happens on first paint.
 * If Stocks takes longer, non-stocks results reveal in default order and
 * promotion is locked off for that query to prevent late layout jumps.
 */
export const STOCKS_PROMOTION_GRACE_MS = 400;

export interface StocksPromotionState {
  isStocksPromoted: boolean;
  shouldHoldForStocks: boolean;
}

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
  maxItems?: number,
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

  const candidateItems =
    typeof maxItems === 'number'
      ? stocksSection.items.slice(0, maxItems)
      : stocksSection.items;

  return candidateItems.some((item) => {
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

const getStockMatchRank = (
  asset: TrendingAsset,
  normalizedTickerQuery: string,
  normalizedNameQuery: string,
): number => {
  const ticker =
    typeof asset.rwaData?.ticker === 'string'
      ? normalizeStockTicker(asset.rwaData.ticker)
      : '';
  const name =
    typeof asset.name === 'string' ? normalizeStockName(asset.name) : '';
  const strippedName =
    typeof asset.name === 'string'
      ? normalizeStockName(stripRwaNameIssuerSuffix(asset.name))
      : '';

  if (normalizedTickerQuery && ticker === normalizedTickerQuery) {
    return 0;
  }
  if (
    normalizedNameQuery &&
    (name === normalizedNameQuery || strippedName === normalizedNameQuery)
  ) {
    return 1;
  }
  if (normalizedTickerQuery && ticker.startsWith(normalizedTickerQuery)) {
    return 2;
  }
  if (
    normalizedNameQuery &&
    (name.startsWith(normalizedNameQuery) ||
      strippedName.startsWith(normalizedNameQuery))
  ) {
    return 3;
  }
  return 4;
};

/**
 * Ranks stock search results by match relevance (exact ticker → exact name →
 * ticker prefix → name prefix → other), breaking ties by market cap descending
 * and deprioritizing zero-price assets.
 */
export const rankStockSearchResults = (
  items: TrendingAsset[],
  query: string,
): TrendingAsset[] => {
  const normalizedTickerQuery = normalizeStockTicker(query);
  const normalizedNameQuery = normalizeStockName(query);
  if ((!normalizedTickerQuery && !normalizedNameQuery) || items.length <= 1) {
    return items;
  }

  return [...items].sort((a, b) => {
    const rankDiff =
      getStockMatchRank(a, normalizedTickerQuery, normalizedNameQuery) -
      getStockMatchRank(b, normalizedTickerQuery, normalizedNameQuery);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    const capA =
      typeof a.marketCap === 'number' && Number.isFinite(a.marketCap)
        ? a.marketCap
        : 0;
    const capB =
      typeof b.marketCap === 'number' && Number.isFinite(b.marketCap)
        ? b.marketCap
        : 0;
    if (capB !== capA) {
      return capB - capA;
    }

    const hasPriceA = parseFloat(a.price) > 0 ? 1 : 0;
    const hasPriceB = parseFloat(b.price) > 0 ? 1 : 0;
    return hasPriceB - hasPriceA;
  });
};

/**
 * Coordinates Stocks promotion with a bounded grace window so results never
 * jump or swap under the user's thumb on slow connections.
 */
export const useStocksPromotion = ({
  searchQuery,
  sections,
  isEnabled,
  maxItems,
}: {
  searchQuery: string;
  sections: Pick<SearchFeedSection, 'feedId' | 'items' | 'isLoading'>[];
  isEnabled: boolean;
  /** Limit exact-match check to the first N visible rows (e.g. MAX_ITEMS_PER_SECTION). */
  maxItems?: number;
}): StocksPromotionState => {
  const stocksSection = useMemo(
    () => sections.find((s) => s.feedId === 'stocks'),
    [sections],
  );
  const hasQuery = searchQuery.trim().length > 0;
  const isStocksLoading = Boolean(stocksSection?.isLoading);
  const hasReadyNonStocksSection = useMemo(
    () =>
      sections.some(
        (s) => s.feedId !== 'stocks' && !s.isLoading && s.items.length > 0,
      ),
    [sections],
  );

  const [lockedQuery, setLockedQuery] = useState<string | null>(null);
  const isPromotionLocked = lockedQuery === searchQuery;

  useEffect(() => {
    setLockedQuery(null);
  }, [searchQuery]);

  const isHoldingReadySections =
    isEnabled &&
    hasQuery &&
    isStocksLoading &&
    hasReadyNonStocksSection &&
    !isPromotionLocked;

  useEffect(() => {
    if (!isHoldingReadySections) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setLockedQuery(searchQuery);
    }, STOCKS_PROMOTION_GRACE_MS);

    return () => clearTimeout(timer);
  }, [isHoldingReadySections, searchQuery]);

  const shouldHoldForStocks =
    isEnabled && hasQuery && isStocksLoading && !isPromotionLocked;

  const isStocksPromoted = useMemo(() => {
    if (!isEnabled || isPromotionLocked) {
      return false;
    }
    return shouldPromoteStocksSection(searchQuery, stocksSection, maxItems);
  }, [isEnabled, isPromotionLocked, maxItems, searchQuery, stocksSection]);

  return { isStocksPromoted, shouldHoldForStocks };
};
