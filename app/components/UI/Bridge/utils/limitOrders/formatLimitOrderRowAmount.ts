import { BigNumber } from 'bignumber.js';
import { fromTokenMinimalUnitString } from '../../../../../util/number/bigint';
import { formatAmountWithLocaleSeparators } from '../formatAmountWithLocaleSeparators';

const MIN_FRACTION_DIGITS = 2;
const MAX_SIGNIFICANT_DIGITS = 3;
const MIN_DISPLAY_AMOUNT = '0.00001';

/**
 * Formats a minimal-unit token amount for the value column of a limit order
 * row, which shares its width with the pair title and status tag. Keeps two
 * decimal places, and up to three significant digits for amounts below 1,
 * e.g. `2,689.30`, `0.10`, `0.123` or `0.0000345`. Rounds down so the row
 * never overstates an amount.
 *
 * @param amount - The amount in minimal units (e.g. wei).
 * @param decimals - The token's decimals.
 * @returns The compact, locale-formatted amount.
 */
export function formatLimitOrderRowAmount(
  amount: string,
  decimals: number,
): string {
  const value = new BigNumber(fromTokenMinimalUnitString(amount, decimals));

  if (value.gt(0) && value.lt(MIN_DISPLAY_AMOUNT)) {
    return `< ${formatAmountWithLocaleSeparators(MIN_DISPLAY_AMOUNT)}`;
  }

  const fractionDigits = Math.max(
    MIN_FRACTION_DIGITS,
    value
      .precision(MAX_SIGNIFICANT_DIGITS, BigNumber.ROUND_DOWN)
      .decimalPlaces() ?? 0,
  );

  return formatAmountWithLocaleSeparators(
    value.toFixed(fractionDigits, BigNumber.ROUND_DOWN),
  );
}
