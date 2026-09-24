import { PREDICT_MARKET_TYPES } from '../../../constants';
import type { PredictMarket, PredictOutcome } from '../../../types';

export const formatMarketGroupOption = (
  market: PredictMarket,
  side?: PredictOutcome['side'],
): string | undefined => {
  const group = market.group;
  if (group?.option?.type !== 'number') {
    return undefined;
  }

  if (group.marketType === PREDICT_MARKET_TYPES.SPREAD && side === undefined) {
    // Keep the selector neutral while preserving the signed row value.
    return String(Math.abs(group.option.value));
  }

  const displayedValue =
    group.marketType === PREDICT_MARKET_TYPES.SPREAD && side === 'no'
      ? -group.option.value
      : group.option.value;

  return group.marketType === PREDICT_MARKET_TYPES.SPREAD && displayedValue > 0
    ? `+${displayedValue}`
    : String(displayedValue);
};
