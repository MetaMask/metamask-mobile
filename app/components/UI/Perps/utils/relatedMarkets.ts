import {
  type MarketTypeFilter,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import { isHip3Filter, normalizeFilterKey } from './marketCategoryMapping';

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

const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();

/**
 * Resolve a market's category id using the controller-backed model shared
 * with the markets list and category pills (see `usePerpsCategories` and
 * `marketCategoryMapping`).
 *
 * Non-HIP-3 (main DEX) markets are `'crypto'`. HIP-3 markets use their
 * `marketType` (stock, pre-ipo, index, etf, commodity, forex) when it is a
 * known category from the controller's `MARKET_CATEGORIES`. Uncategorised
 * HIP-3 markets have no related-markets collection.
 */
const getMarketCategoryId = (
  market: PerpsMarketData,
): Exclude<MarketTypeFilter, 'all'> | undefined =>
  !market.isHip3
    ? 'crypto'
    : isHip3Filter(market.marketType)
      ? market.marketType
      : undefined;

export const getRelatedMarketsForMarket = (
  currentMarket: PerpsMarketData | null | undefined,
  markets: PerpsMarketData[],
): RelatedMarketsResult | null => {
  if (!currentMarket?.symbol) {
    return null;
  }

  const categoryId = getMarketCategoryId(currentMarket);
  if (!categoryId) {
    return null;
  }

  const currentSymbol = normalizeSymbol(currentMarket.symbol);
  const relatedMarkets = markets.filter(
    (market) =>
      normalizeSymbol(market.symbol) !== currentSymbol &&
      getMarketCategoryId(market) === categoryId,
  );

  if (relatedMarkets.length === 0) {
    return null;
  }

  return {
    collection: {
      id: categoryId,
      label: strings(`perps.home.tabs.${normalizeFilterKey(categoryId)}`),
    },
    markets: relatedMarkets,
  };
};
