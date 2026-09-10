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
 * In-range strings (≤ 4 fractional digits) are returned byte-identical so
 * existing callers that send `'10.00'` or `'0.0007'` keep their wire format.
 * Only strings that genuinely carry excess precision are re-serialized.
 */
export const capRedeemAmount = (
  amount: string | number | undefined,
): string => {
  const parsed = safeParseBigNumber(amount);
  if (!parsed.isFinite() || parsed.lte(0)) return '0';

  const fraction = String(amount).split('.')[1] ?? '';
  if (fraction.length <= REDEEM_AMOUNT_DECIMALS) return String(amount);

  return parsed
    .decimalPlaces(REDEEM_AMOUNT_DECIMALS, BigNumber.ROUND_FLOOR)
    .toFixed();
};
