import {
  applyMarketFilters,
  getMarketTypeFilter,
  type MarketTypeFilter,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import { normalizeFilterKey } from './marketCategoryMapping';

export const RELATED_MARKETS_SOURCE = 'related_markets';
export const RELATED_MARKET_CLICKED = 'related_market_clicked';
export const RELATED_MARKETS_HEADER_TAPPED = 'related_markets_header_tapped';

export const RELATED_MARKETS_EVENT_PROPERTY = {
  SOURCE_MARKET: 'source_market',
  MARKET: 'market',
  CATEGORY: 'category',
  POSITION: 'position',
} as const;

export interface RelatedMarketCollection {
  id: Exclude<MarketTypeFilter, 'all'>;
  label: string;
}

export interface RelatedMarketsResult {
  collection: RelatedMarketCollection;
  markets: PerpsMarketData[];
}

/**
 * Whether a market belongs to a category that can show Related markets.
 * Does not require the full markets list — `PerpsRelatedMarkets` resolves
 * related tiles once its own `usePerpsMarkets` subscription delivers data.
 */
export const hasRelatedMarketsCategory = (
  currentMarket: PerpsMarketData | null | undefined,
): boolean => {
  if (!currentMarket?.symbol) {
    return false;
  }

  return getMarketTypeFilter(currentMarket) !== 'all';
};

/**
 * Resolve the Related markets rail for a given market.
 *
 * Market classification (`getMarketTypeFilter`) and category filtering
 * (`applyMarketFilters`) are owned by `@metamask/perps-controller` — the same
 * functions `getMarketDataWithPrices` runs server-side — so every client
 * (related markets, category shortcuts, market list) shares one category model
 * and stays in sync as categories evolve. They are applied here to the
 * already-streamed markets list to avoid a redundant fetch.
 */
export const getRelatedMarketsForMarket = (
  currentMarket: PerpsMarketData | null | undefined,
  markets: PerpsMarketData[],
): RelatedMarketsResult | null => {
  if (!currentMarket?.symbol) {
    return null;
  }

  const category = getMarketTypeFilter(currentMarket);
  if (category === 'all') {
    return null;
  }

  // Categorisation is delegated to the controller; the current market is
  // excluded case-insensitively here so a route symbol whose casing differs
  // from the streamed list never appears as its own related tile.
  const currentSymbol = currentMarket.symbol.trim().toUpperCase();
  const relatedMarkets = applyMarketFilters(markets, {
    categories: [category],
  }).filter((market) => market.symbol.trim().toUpperCase() !== currentSymbol);

  if (relatedMarkets.length === 0) {
    return null;
  }

  return {
    collection: {
      id: category,
      label: strings(`perps.home.tabs.${normalizeFilterKey(category)}`),
    },
    markets: relatedMarkets,
  };
};
