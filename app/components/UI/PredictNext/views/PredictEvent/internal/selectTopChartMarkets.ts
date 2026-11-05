import { parsePredictDecimal } from '../../../events/shared/formatting';
import type { PredictMarket } from '../../../types';

export const TOP_CHART_MARKET_LIMIT = 3;

const getYesAsk = (market: PredictMarket) => {
  const yesOutcome = market.outcomes.find((outcome) => outcome.side === 'yes');
  const askPrice = parsePredictDecimal(yesOutcome?.askPrice);
  return askPrice === undefined || askPrice.lt(0) ? undefined : askPrice;
};

/**
 * The active Markets with the highest yes ask, the same price the Market
 * cards show. Ties keep the Event's Market order.
 */
export const selectTopChartMarkets = (
  markets: readonly PredictMarket[],
  limit = TOP_CHART_MARKET_LIMIT,
): PredictMarket[] =>
  markets
    .flatMap((market, index) => {
      const askPrice =
        market.status === 'active' ? getYesAsk(market) : undefined;
      return askPrice === undefined ? [] : [{ market, askPrice, index }];
    })
    .sort(
      (left, right) =>
        right.askPrice.comparedTo(left.askPrice) || left.index - right.index,
    )
    .slice(0, limit)
    .map(({ market }) => market);
