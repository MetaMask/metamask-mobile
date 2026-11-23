import BigNumber from 'bignumber.js';
import type { PredictDecimal } from '../types';

export const roundProbabilityToWhole = (
  value: PredictDecimal | number,
): string =>
  new BigNumber(value)
    .shiftedBy(2)
    .integerValue(BigNumber.ROUND_HALF_UP)
    .toFixed();

export const formatProbabilityChange = (
  initial: PredictDecimal,
  latest: PredictDecimal,
): string => {
  const change = new BigNumber(latest)
    .minus(initial)
    .shiftedBy(2)
    .integerValue(BigNumber.ROUND_HALF_UP);

  return `${change.isGreaterThanOrEqualTo(0) ? '+' : ''}${change.toFixed()} pts`;
};
