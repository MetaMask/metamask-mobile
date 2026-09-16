import BigNumber from 'bignumber.js';
import type { PredictDecimal } from '../types';

/**
 * Formats a price in [0, 1] as cents for display, e.g. '0.53' → '53¢' and
 * '0.4651' → '46.5¢'. Whole cents drop the decimal; anything else keeps one.
 */
export const formatCents = (price: PredictDecimal | number): string => {
  const cents = new BigNumber(price).times(100);
  if (cents.isNaN()) {
    return '0¢';
  }
  const rounded = cents.decimalPlaces(1);
  return `${rounded.toFixed(rounded.isInteger() ? 0 : 1)}¢`;
};
