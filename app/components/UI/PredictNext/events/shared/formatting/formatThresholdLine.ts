import { PREDICT_MARKET_TYPES } from '../../../constants';
import type { PredictMarket } from '../../../types';
import { formatMarketGroupOption } from './formatMarketGroupOption';

/**
 * Names a threshold line on its own, outside its card: the card's label and
 * the line ("Josh Jacobs 60+"), or just the line without a label. Undefined
 * for any other Market.
 */
export const formatThresholdLine = (
  market: PredictMarket,
): string | undefined => {
  if (market.group?.marketType !== PREDICT_MARKET_TYPES.THRESHOLD) {
    return undefined;
  }
  const line = formatMarketGroupOption(market);
  if (line === undefined) {
    return undefined;
  }
  const label = market.group.label?.trim();
  return label ? `${label} ${line}` : line;
};
