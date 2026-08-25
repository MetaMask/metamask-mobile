import type {
  PredictMarket,
  PredictMarketGroup,
  PredictMarketOption,
} from '../../../types';

type SupportedMarketType = 'spread' | 'total';

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
  marketType: SupportedMarketType;
  markets: { market: GroupedMarket; index: number }[];
  optionValues: Set<number>;
  isValid: boolean;
}

const isSupportedMarket = (market: PredictMarket): market is GroupedMarket => {
  const group = market.group;
  return (
    group !== undefined &&
    group.key.trim().length > 0 &&
    group.groupType === 'marketSelector' &&
    (group.marketType === 'total' || group.marketType === 'spread') &&
    group.option?.type === 'number' &&
    Number.isFinite(group.option.value)
  );
};

const compareMarkets = (
  left: { market: GroupedMarket; index: number },
  right: { market: GroupedMarket; index: number },
): number =>
  (left.market.group.displayOrder ?? left.index) -
  (right.market.group.displayOrder ?? right.index);

export const createMarketGroupProjection = (
  markets: readonly PredictMarket[],
): readonly MarketGroupProjection[] => {
  const candidates = new Map<string, GroupCandidate>();

  markets.forEach((market, index) => {
    if (!isSupportedMarket(market)) {
      return;
    }

    const group = market.group;
    const existing = candidates.get(group.key);
    if (existing === undefined) {
      candidates.set(group.key, {
        firstIndex: index,
        marketType: group.marketType,
        markets: [{ market, index }],
        optionValues: new Set([group.option.value]),
        isValid: true,
      });
      return;
    }

    const hasDuplicateOption = existing.optionValues.has(group.option.value);
    existing.markets.push({ market, index });
    existing.optionValues.add(group.option.value);
    existing.isValid =
      existing.isValid && existing.marketType === group.marketType;
    existing.isValid = existing.isValid && !hasDuplicateOption;
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
      key,
      marketType: candidate.marketType,
      markets: candidate.markets
        .sort(compareMarkets)
        .map(({ market }) => market),
      firstIndex: candidate.firstIndex,
    });
  }

  return markets
    .flatMap((market, index): MarketGroupProjection[] => {
      if (!isSupportedMarket(market)) {
        return [{ type: 'standard', market, firstIndex: index }];
      }

      const candidate = candidates.get(market.group.key);
      if (candidate === undefined || invalidGroupKeys.has(market.group.key)) {
        return [{ type: 'standard', market, firstIndex: index }];
      }

      if (candidate.firstIndex !== index) {
        return [];
      }

      const group = groupEntries.get(market.group.key);
      return group === undefined ? [] : [group];
    })
    .sort((left, right) => left.firstIndex - right.firstIndex);
};

export default createMarketGroupProjection;
