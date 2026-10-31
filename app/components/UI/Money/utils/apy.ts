import BigNumber from 'bignumber.js';

/**
 * Parses a decimal APY or vault-rate string into a number.
 *
 * @param value - Decimal rate string from the Money API.
 * @returns The parsed number, or undefined when missing or not finite.
 */
export const parseApy = (
  value: string | null | undefined,
): number | undefined => {
  if (value == null) {
    return undefined;
  }
  const parsed = new BigNumber(value);
  if (parsed.isNaN() || !parsed.isFinite()) {
    return undefined;
  }
  return parsed.toNumber();
};

/**
 * Converts a decimal APY into a one-decimal percentage.
 *
 * @param apyDecimal - Decimal APY, for example `0.071` for 7.1%.
 * @returns The percentage, or undefined when the decimal is missing.
 */
export const toApyPercent = (
  apyDecimal: number | undefined,
): number | undefined =>
  apyDecimal !== undefined
    ? new BigNumber(apyDecimal)
        .multipliedBy(100)
        .dp(1, BigNumber.ROUND_HALF_UP)
        .toNumber()
    : undefined;
