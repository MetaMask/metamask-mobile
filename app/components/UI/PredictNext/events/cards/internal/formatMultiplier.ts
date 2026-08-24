import BigNumber from 'bignumber.js';
import type { PredictDecimal } from '../../../types';
import { parsePredictDecimal } from './parsePredictDecimal';

const trimTrailingZeros = (value: string): string =>
  value.replace(/\.?0+$/, '');

export const formatMultiplier = (
  askPrice?: PredictDecimal,
): string | undefined => {
  const price = parsePredictDecimal(askPrice);

  if (price === undefined || price.lte(0)) {
    return undefined;
  }

  const multiplier = new BigNumber('1').div(price);
  const decimalPlaces = multiplier.gte(10) ? 1 : 2;
  const formatted = trimTrailingZeros(multiplier.toFixed(decimalPlaces));

  return `${formatted}x`;
};
