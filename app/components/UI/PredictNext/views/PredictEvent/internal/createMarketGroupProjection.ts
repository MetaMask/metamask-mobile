import { PREDICT_MARKET_TYPES } from '../../../constants';
import type { PredictMarket } from '../../../types';
import {
  hasConsistentLines,
  isMarketSelectorMarket,
  type MarketSelectorMarket,
} from './marketSelectorGroup';

// Only the line pickers this flat path renders. Kept narrow on purpose:
// `EventMarketList` renders anything that isn't a total as a spread card.
type SupportedMarketType =
  | typeof PREDICT_MARKET_TYPES.TOTAL
  | typeof PREDICT_MARKET_TYPES.SPREAD;

type GroupedMarket = MarketSelectorMarket & {
  group: MarketSelectorMarket['group'] & { marketType: SupportedMarketType };
};

export interface StandardMarketProjection {
  type: 'standard';
  market: PredictMarket;
  firstIndex: number;
}

export interface GroupedMarketProjection {
  type: 'group';
  key: string;
  marketType: SupportedMarketType;
  markets: readonly GroupedMarket[];
  firstIndex: number;
}

export type MarketGroupProjection =
  | StandardMarketProjection
  | GroupedMarketProjection;

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

export function createMarketGroupProjection(
  markets: readonly PredictMarket[],
): readonly MarketGroupProjection[] {
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
  const groupEntries = new Map<string, GroupedMarketProjection>();

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
    .flatMap((market, index): MarketGroupProjection[] => {
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
    .sort((left, right) => left.firstIndex - right.firstIndex);
}

export default createMarketGroupProjection;
