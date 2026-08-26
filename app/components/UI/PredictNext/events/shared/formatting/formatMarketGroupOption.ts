import type { PredictMarket, PredictOutcome } from '../../../types';

export const formatMarketGroupOption = (
  market: PredictMarket,
  side?: PredictOutcome['side'],
): string | undefined => {
  const group = market.group;
  if (group?.option?.type !== 'number') {
    return undefined;
  }

  const value =
    group.marketType === 'spread'
      ? Math.abs(group.option.value)
      : group.option.value;
  const displayedValue =
    group.marketType === 'spread' && side !== undefined
      ? side === 'yes'
        ? value
        : -value
      : value;

  if (group.marketType === 'spread' && side === undefined) {
    return String(displayedValue);
  }

  return group.marketType === 'spread' && displayedValue > 0
    ? `+${displayedValue}`
    : String(displayedValue);
};
