import {
  type MarketTypeFilter,
  type PerpsMarketData,
} from '@metamask/perps-controller';

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

const RELATED_MARKET_CATEGORIES: Record<
  Exclude<MarketTypeFilter, 'all'>,
  RelatedMarketCollection
> = {
  crypto: { id: 'crypto', label: 'Crypto' },
  stocks: { id: 'stocks', label: 'Stocks' },
  'pre-ipo': { id: 'pre-ipo', label: 'Pre-IPO' },
  indices: { id: 'indices', label: 'Indices' },
  etfs: { id: 'etfs', label: 'ETFs' },
  commodities: { id: 'commodities', label: 'Commodities' },
  forex: { id: 'forex', label: 'Forex' },
  new: { id: 'new', label: 'New' },
};

const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();

export const getRelatedMarketCollection = (
  market: PerpsMarketData,
): RelatedMarketCollection | null => {
  if (market.isNewMarket) {
    return RELATED_MARKET_CATEGORIES.new;
  }

  switch (market.marketType) {
    case 'stock':
      return RELATED_MARKET_CATEGORIES.stocks;
    case 'pre-ipo':
      return RELATED_MARKET_CATEGORIES['pre-ipo'];
    case 'index':
      return RELATED_MARKET_CATEGORIES.indices;
    case 'etf':
      return RELATED_MARKET_CATEGORIES.etfs;
    case 'commodity':
      return RELATED_MARKET_CATEGORIES.commodities;
    case 'forex':
      return RELATED_MARKET_CATEGORIES.forex;
    case 'crypto':
    default:
      // Crypto (or untyped) markets group together, but skip HIP-3 builder
      // markets with no explicit category to avoid mixing synthetic pairs.
      return market.isHip3 ? null : RELATED_MARKET_CATEGORIES.crypto;
  }
};

export const getRelatedMarketsForMarket = (
  currentMarket: PerpsMarketData | null | undefined,
  markets: PerpsMarketData[],
): RelatedMarketsResult | null => {
  if (!currentMarket?.symbol) {
    return null;
  }

  const collection = getRelatedMarketCollection(currentMarket);
  if (!collection) {
    return null;
  }

  const currentSymbol = normalizeSymbol(currentMarket.symbol);
  const relatedMarkets = markets.filter(
    (market) =>
      normalizeSymbol(market.symbol) !== currentSymbol &&
      getRelatedMarketCollection(market)?.id === collection.id,
  );

  if (relatedMarkets.length === 0) {
    return null;
  }

  return {
    collection,
    markets: relatedMarkets,
  };
};
