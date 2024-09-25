import BigNumber from 'bignumber.js';
import { getPowerOfTen, bnOne, getValueAsBn, bnZero } from '../bignumber';

// Determine if a value is equal to or above an evaluated `exponent`, or equal to or below its evaluated inverse
export const isEqualOrGreaterOrderOfMagnitude = (
  value: BigNumber,
  exponent: number,
): boolean => {
  if (value.eq(bnZero)) return false;
  return (
    (value.gte(bnOne) && value.gte(getPowerOfTen(exponent))) ||
    value.lte(bnOne.dividedBy(getPowerOfTen(exponent)))
  );
};

// Fix a value to a `fixed` value of decimal places either in number or scientific notation depending on the `exponentLimit`
export const fixDisplayAmount = (
  value: BigNumber | string | number,
  fixed = 2,
  exponentLimit = 21,
  roundingMode: BigNumber.RoundingMode = BigNumber.ROUND_DOWN,
): string => {
  const valueAsBn = getValueAsBn(value);
  const absoluteExponent = Math.abs(exponentLimit);
  if (isEqualOrGreaterOrderOfMagnitude(valueAsBn, absoluteExponent)) {
    return valueAsBn.toExponential(fixed);
  }
  return valueAsBn.toFixed(fixed, roundingMode);
};
