import { PREDICT_MARKET_TYPES } from '../../../constants';
import type {
  PredictMarket,
  PredictMarketGroup,
  PredictMarketOption,
  PredictMarketType,
} from '../../../types';

/** A Market that is one line of a `marketSelector` group (a line picker). */
export type MarketSelectorMarket = PredictMarket & {
  group: PredictMarketGroup & {
    groupType: 'marketSelector';
    marketType: PredictMarketType;
    option: PredictMarketOption;
  };
};

export function isMarketSelectorMarket(
  market: PredictMarket,
): market is MarketSelectorMarket {
  const group = market.group;
  return (
    group !== undefined &&
    group.key.trim().length > 0 &&
    group.groupType === 'marketSelector' &&
    group.marketType !== undefined &&
    group.marketType.trim().length > 0 &&
    group.option?.type === 'number' &&
    Number.isFinite(group.option.value)
  );
}

/**
 * Whether one group's lines can share a picker: a single market type, and no
 * repeated line except for spreads, where Kalshi has one Market per Team for
 * each magnitude.
 */
export function hasConsistentLines(
  markets: readonly MarketSelectorMarket[],
): boolean {
  const marketType = markets[0]?.group.marketType;
  if (markets.some((market) => market.group.marketType !== marketType)) {
    return false;
  }
  if (marketType === PREDICT_MARKET_TYPES.SPREAD) {
    return true;
  }
  const lines = new Set(markets.map((market) => market.group.option.value));
  return lines.size === markets.length;
}
