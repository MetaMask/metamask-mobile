import { PREDICT_MARKET_TYPES } from '../../../constants';
import type { PredictMarket } from '../../../types';
import type { MarketLayoutCard } from './createMarketLayoutProjection';
import {
  hasConsistentLines,
  isMarketSelectorMarket,
  type MarketSelectorMarket,
} from './marketSelectorGroup';

// Spread and total are the only line pickers a Market without layout renders
// as one card. Other groups stay standard cards, one per Market.
type SupportedMarketType =
  | typeof PREDICT_MARKET_TYPES.TOTAL
  | typeof PREDICT_MARKET_TYPES.SPREAD;

type GroupedMarket = MarketSelectorMarket & {
  group: MarketSelectorMarket['group'] & { marketType: SupportedMarketType };
};

type FlatRow =
  | { type: 'standard'; market: PredictMarket; firstIndex: number }
  | {
      type: 'group';
      key: string;
      marketType: SupportedMarketType;
      markets: readonly GroupedMarket[];
      firstIndex: number;
    };

interface GroupCandidate {
  firstIndex: number;
  outputKey: string;
  marketType: SupportedMarketType;
  markets: { market: GroupedMarket; index: number }[];
}

function getProjectionGroupKey(market: GroupedMarket): string {
  return market.group.key;
}

function isSupportedMarket(market: PredictMarket): market is GroupedMarket {
  return (
    isMarketSelectorMarket(market) &&
    (market.group.marketType === PREDICT_MARKET_TYPES.TOTAL ||
      market.group.marketType === PREDICT_MARKET_TYPES.SPREAD)
  );
}

function compareMarkets(
  left: { market: GroupedMarket; index: number },
  right: { market: GroupedMarket; index: number },
): number {
  return (
    (left.market.group.displayOrder ?? left.index) -
    (right.market.group.displayOrder ?? right.index)
  );
}

function getProjectedMarkets(
  candidate: GroupCandidate,
): readonly GroupedMarket[] {
  return [...candidate.markets]
    .sort(compareMarkets)
    .map(({ market }) => market);
}

function toCard(row: FlatRow): MarketLayoutCard {
  if (row.type === 'standard') {
    return {
      type: 'standard',
      key: `market:${row.market.id}`,
      market: row.market,
    };
  }
  return {
    type: 'marketSelector',
    key: row.key,
    marketType: row.marketType,
    markets: row.markets,
    name: 'self',
  };
}

/**
 * Projects Markets that have no layout into the same cards a laid-out Event
 * uses. A spread or total group with consistent lines is one self-named line
 * picker. Every other Market is a standard card.
 */
export function projectFlatMarketCards(
  markets: readonly PredictMarket[],
): readonly MarketLayoutCard[] {
  const candidates = new Map<string, GroupCandidate>();

  markets.forEach((market, index) => {
    if (!isSupportedMarket(market)) {
      return;
    }

    const group = market.group;
    const projectionGroupKey = getProjectionGroupKey(market);
    const existing = candidates.get(projectionGroupKey);
    if (existing === undefined) {
      candidates.set(projectionGroupKey, {
        firstIndex: index,
        outputKey: group.key,
        marketType: group.marketType,
        markets: [{ market, index }],
      });
      return;
    }

    existing.markets.push({ market, index });
  });

  const invalidGroupKeys = new Set(
    [...candidates.entries()]
      .filter(
        ([, candidate]) =>
          !hasConsistentLines(candidate.markets.map(({ market }) => market)),
      )
      .map(([key]) => key),
  );
  const groupEntries = new Map<string, FlatRow>();

  for (const [key, candidate] of candidates) {
    if (invalidGroupKeys.has(key)) {
      continue;
    }

    groupEntries.set(key, {
      type: 'group',
      key: candidate.outputKey,
      marketType: candidate.marketType,
      markets: getProjectedMarkets(candidate),
      firstIndex: candidate.firstIndex,
    });
  }

  return markets
    .flatMap((market, index): FlatRow[] => {
      if (!isSupportedMarket(market)) {
        return [{ type: 'standard', market, firstIndex: index }];
      }

      const projectionGroupKey = getProjectionGroupKey(market);
      const candidate = candidates.get(projectionGroupKey);
      if (candidate === undefined || invalidGroupKeys.has(projectionGroupKey)) {
        return [{ type: 'standard', market, firstIndex: index }];
      }

      if (candidate.firstIndex !== index) {
        return [];
      }

      const group = groupEntries.get(projectionGroupKey);
      return group === undefined ? [] : [group];
    })
    .sort((left, right) => left.firstIndex - right.firstIndex)
    .map(toCard);
}

/** The first Market of the first card, for the Event history fallback. */
export function firstMarketOf(
  cards: readonly MarketLayoutCard[],
): PredictMarket | undefined {
  const card = cards[0];
  if (card === undefined) {
    return undefined;
  }
  return card.type === 'standard' ? card.market : card.markets[0];
}
