import { BigNumber } from 'bignumber.js';
import { trimTrailingZeros } from '../trimTrailingZeros';

/**
 * Maximum number of significant digits kept in the fractional part of a
 * limit price that was set via a quick preset buttons or
 * a committed custom percent.
 */
export const LIMIT_ORDER_QUICK_PRICE_SIGNIFICANT_DIGITS = 6;

const truncateFractionalSignificantDigits = (
  value: string,
  significantDigits: number,
): string => {
  const decimalPointIndex = value.indexOf('.');
  if (decimalPointIndex === -1) {
    return value;
  }

  const integerPart = value.slice(0, decimalPointIndex);
  const fractionalPart = value.slice(decimalPointIndex + 1);

  let leadingZeroCount = 0;
  while (
    leadingZeroCount < fractionalPart.length &&
    fractionalPart[leadingZeroCount] === '0'
  ) {
    leadingZeroCount++;
  }

  const keepLength = leadingZeroCount + significantDigits;
  if (fractionalPart.length <= keepLength) {
    return value;
  }

  return `${integerPart}.${fractionalPart.slice(0, keepLength)}`;
};

export const formatLimitOrderQuickPrice = (
  value: string | undefined,
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = new BigNumber(value);
  if (!parsed.isFinite()) {
    return value;
  }

  const truncated = truncateFractionalSignificantDigits(
    parsed.toFixed(),
    LIMIT_ORDER_QUICK_PRICE_SIGNIFICANT_DIGITS,
  );

  return trimTrailingZeros(truncated);
};
