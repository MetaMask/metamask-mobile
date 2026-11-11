import BigNumber from 'bignumber.js';
import type { PredictDecimal } from '../../../types';
import { parsePredictDecimal } from './parsePredictDecimal';

const HUNDRED = new BigNumber('100');

export const getAskPricePercent = (
  askPrice?: PredictDecimal,
): number | undefined => {
  const value = parsePredictDecimal(askPrice);

  if (value === undefined || value.lt(0)) {
    return undefined;
  }

  return BigNumber.min(HUNDRED, value.times(HUNDRED)).toNumber();
};
