import { PredictOutcome } from '../../types';

export const BET_AMOUNT = 100;

export const getPayoutDisplay = (price: number): string => {
  if (price <= 0 || price >= 1) {
    return `$${BET_AMOUNT.toFixed(2)}`;
  }

  return `$${(BET_AMOUNT / price).toFixed(2)}`;
};

export const calculateTotalVolume = (outcomes: PredictOutcome[]): number =>
  outcomes.reduce((sum, outcome) => {
    const volume =
      typeof outcome.volume === 'string'
        ? parseFloat(outcome.volume)
        : outcome.volume || 0;
    return sum + volume;
  }, 0);

export const calculateRemainingOptions = (
  outcomes: PredictOutcome[],
  visibleCount: number,
): number => {
  const totalOutcomes = outcomes.reduce((sum, outcome) => {
    const tokenCount = Array.isArray(outcome.tokens)
      ? outcome.tokens.length
      : 0;
    return sum + tokenCount;
  }, 0);

  return Math.max(0, totalOutcomes - visibleCount);
};
