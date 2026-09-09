import BigNumber from 'bignumber.js';
import type { PredictDecimal } from '../../../types';
import { parsePredictDecimal } from './parsePredictDecimal';

export const formatAskPrice = (
  askPrice?: PredictDecimal,
): string | undefined => {
  const price = parsePredictDecimal(askPrice);

  if (price === undefined || price.lt(0)) {
    return undefined;
  }

  const cents = price.times('100').integerValue(BigNumber.ROUND_HALF_UP);

  return `${cents.toFixed(0)}¢`;
};
