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

  const relatedMarkets = applyMarketFilters(markets, {
    categories: [category],
    excludeSymbols: [currentMarket.symbol],
  });

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
