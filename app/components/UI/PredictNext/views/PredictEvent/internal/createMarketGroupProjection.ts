import { PREDICT_MARKET_TYPES } from '../../../constants';
import type {
  PredictMarket,
  PredictMarketGroup,
  PredictMarketOption,
} from '../../../types';

type SupportedMarketType =
  (typeof PREDICT_MARKET_TYPES)[keyof typeof PREDICT_MARKET_TYPES];

type GroupedMarket = PredictMarket & {
  group: PredictMarketGroup & {
    marketType: SupportedMarketType;
    option: PredictMarketOption;
  };
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
  optionValues: Set<number>;
  isValid: boolean;
}

function getProjectionGroupKey(market: GroupedMarket): string {
  return market.group.key;
}

function isSupportedMarket(market: PredictMarket): market is GroupedMarket {
  const group = market.group;
  return (
    group !== undefined &&
    group.key.trim().length > 0 &&
    group.groupType === 'marketSelector' &&
    (group.marketType === PREDICT_MARKET_TYPES.TOTAL ||
      group.marketType === PREDICT_MARKET_TYPES.SPREAD) &&
    group.option?.type === 'number' &&
    Number.isFinite(group.option.value)
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
        optionValues: new Set([group.option.value]),
        isValid: true,
      });
      return;
    }

    // Kalshi has one market per team for each spread magnitude.
    const hasDuplicateOption =
      group.marketType !== PREDICT_MARKET_TYPES.SPREAD &&
      existing.optionValues.has(group.option.value);
    existing.markets.push({ market, index });
    existing.optionValues.add(group.option.value);
    existing.isValid =
      existing.isValid &&
      existing.marketType === group.marketType &&
      !hasDuplicateOption;
  });

  const invalidGroupKeys = new Set(
    [...candidates.entries()]
      .filter(([, candidate]) => !candidate.isValid)
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
