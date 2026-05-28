import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';

export const RELATED_MARKETS_SOURCE = PERPS_EVENT_VALUE.SOURCE.RELATED_MARKETS;
export const RELATED_MARKET_CLICKED =
  PERPS_EVENT_VALUE.INTERACTION_TYPE.RELATED_MARKET_CLICKED;

export const RELATED_MARKETS_EVENT_PROPERTY = {
  SOURCE_MARKET: PERPS_EVENT_PROPERTY.SOURCE_MARKET,
  MARKET: PERPS_EVENT_PROPERTY.MARKET,
  CATEGORY: PERPS_EVENT_PROPERTY.CATEGORY,
  POSITION: PERPS_EVENT_PROPERTY.POSITION,
} as const;

export type RelatedMarketCollectionType =
  | 'thematic'
  | 'sector'
  | 'geographic'
  | 'dynamic';

export interface RelatedMarketCollection {
  id: string;
  label: string;
  type: RelatedMarketCollectionType;
  symbols: string[];
}

export interface RelatedMarketsResult {
  collection: RelatedMarketCollection;
  markets: PerpsMarketData[];
}

const COLLECTION_PRIORITY: Record<RelatedMarketCollectionType, number> = {
  thematic: 0,
  sector: 1,
  geographic: 1,
  dynamic: 2,
};

export const RELATED_MARKET_COLLECTIONS: RelatedMarketCollection[] = [
  {
    id: 'ai',
    label: 'AI',
    type: 'thematic',
    symbols: [
      'RNDR',
      'RENDER',
      'FET',
      'TAO',
      'WLD',
      'AI',
      'IO',
      'GRASS',
      'VIRTUAL',
      'AI16Z',
      'AIXBT',
      'KAITO',
    ],
  },
  {
    id: 'real_world_assets',
    label: 'Real-world assets',
    type: 'thematic',
    symbols: [
      'ONDO',
      'PAXG',
      'xyz:SILVER',
      'xyz:CL',
      'xyz:BRENTOIL',
      'xyz:COPPER',
      'xyz:NATGAS',
      'xyz:PLATINUM',
      'xyz:PALLADIUM',
      'xyz:URANIUM',
    ],
  },
  {
    id: 'defi',
    label: 'DeFi',
    type: 'sector',
    symbols: ['AAVE', 'COMP', 'UNI', 'LDO', 'MKR', 'CRV', 'SNX', 'ONDO'],
  },
  {
    id: 'commodities',
    label: 'Commodities',
    type: 'sector',
    symbols: [
      'xyz:SILVER',
      'xyz:CL',
      'xyz:BRENTOIL',
      'xyz:COPPER',
      'xyz:NATGAS',
      'xyz:PLATINUM',
      'xyz:PALLADIUM',
      'xyz:URANIUM',
      'xyz:ALUMINIUM',
      'xyz:CORN',
      'xyz:WHEAT',
    ],
  },
  {
    id: 'semiconductors',
    label: 'Semiconductors',
    type: 'sector',
    symbols: ['xyz:TSM', 'xyz:MRVL', 'xyz:ASML', 'xyz:ARM', 'xyz:DRAM'],
  },
];

const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();

export const getPrimaryRelatedMarketCollection = (
  symbol: string,
): RelatedMarketCollection | null => {
  const normalizedSymbol = normalizeSymbol(symbol);
  const collections = RELATED_MARKET_COLLECTIONS.filter((collection) =>
    collection.symbols.some(
      (collectionSymbol) =>
        normalizeSymbol(collectionSymbol) === normalizedSymbol,
    ),
  );

  if (collections.length === 0) {
    return null;
  }

  return [...collections].sort((a, b) => {
    const priorityDelta =
      COLLECTION_PRIORITY[a.type] - COLLECTION_PRIORITY[b.type];

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return (
      RELATED_MARKET_COLLECTIONS.indexOf(a) -
      RELATED_MARKET_COLLECTIONS.indexOf(b)
    );
  })[0];
};

export const getRelatedMarketsForMarket = (
  currentMarket: PerpsMarketData | null | undefined,
  markets: PerpsMarketData[],
): RelatedMarketsResult | null => {
  if (!currentMarket?.symbol) {
    return null;
  }

  const collection = getPrimaryRelatedMarketCollection(currentMarket.symbol);
  if (!collection) {
    return null;
  }

  const currentSymbol = normalizeSymbol(currentMarket.symbol);
  const marketsBySymbol = new Map(
    markets.map((market) => [normalizeSymbol(market.symbol), market]),
  );

  const relatedMarkets = collection.symbols
    .map((symbol) => marketsBySymbol.get(normalizeSymbol(symbol)))
    .filter((market): market is PerpsMarketData => {
      if (!market) {
        return false;
      }

      return normalizeSymbol(market.symbol) !== currentSymbol;
    });

  if (relatedMarkets.length === 0) {
    return null;
  }

  return {
    collection,
    markets: relatedMarkets,
  };
};
