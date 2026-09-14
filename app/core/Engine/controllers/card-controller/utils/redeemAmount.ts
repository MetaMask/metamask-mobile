import BigNumber from 'bignumber.js';
import { safeParseBigNumber } from '../../../../../util/number/bignumber';

/**
 * Max fractional digits for a redeem claim. Matches the display precision so
 * the amount shown on the redeem screen is the amount submitted to the
 * provider. Digits beyond this are floored (never rounded up) so we never
 * request more than the available balance.
 */
export const REDEEM_AMOUNT_DECIMALS = 4;

/**
 * Floors an amount to {@link REDEEM_AMOUNT_DECIMALS} fractional digits.
 *
 * Plain decimal strings that are already in range (≤ 4 fractional digits) are
 * returned byte-identical so callers that send `'10.00'` or `'0.0007'` keep
 * their wire format. Numbers and scientific-notation strings always go through
 * BigNumber — `String(1e-7)` is `'1e-7'`, which has no `.` and would otherwise
 * leak exponential notation onto the wire.
 */
export const capRedeemAmount = (
  amount: string | number | undefined,
): string => {
  const parsed = safeParseBigNumber(amount);
  if (!parsed.isFinite() || parsed.lte(0)) return '0';

  // Only plain decimal strings are safe to short-circuit. Numbers and any
  // string carrying `e`/`E` (or thousands separators) must be re-serialized
  // via BigNumber so the result is always a fixed decimal.
  const isPlainDecimalString =
    typeof amount === 'string' && !/[eE]/.test(amount) && !amount.includes(',');

  if (isPlainDecimalString) {
    const fraction = amount.split('.')[1] ?? '';
    if (fraction.length <= REDEEM_AMOUNT_DECIMALS) {
      return amount;
    }
  }

  return parsed
    .decimalPlaces(REDEEM_AMOUNT_DECIMALS, BigNumber.ROUND_FLOOR)
    .toFixed();
};
