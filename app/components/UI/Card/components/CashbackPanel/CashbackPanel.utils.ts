import BigNumber from 'bignumber.js';
import { safeParseBigNumber } from '../../../../../util/number/bignumber';

/**
 * Cashback pays out in whole multiples of this amount (USD, mUSD is 1:1).
 * The backend is the source of truth for whether a payout is allowed
 * (`isWithdrawable` on the reward wallet); this only shapes the UI.
 */
export const CASHBACK_PAYOUT_INCREMENT = 5;

export interface CashbackPayoutBreakdown {
  /** Everything accrued so far. */
  available: number;
  /** The whole-increment part that can be paid out now. */
  claimable: number;
  /** What carries over towards the next increment. */
  remainder: number;
  /** Progress towards the next increment, 0 to 1. */
  progress: number;
}

const ZERO = new BigNumber(0);

/**
 * Splits an accrued balance into the payable whole-increment amount and the
 * remainder that carries over. $12.30 with a $5 increment pays $10 and
 * carries $2.30 (46% of the way to the next $5).
 */
export const getCashbackPayoutBreakdown = (
  balance: string | number | undefined,
  increment: number = CASHBACK_PAYOUT_INCREMENT,
): CashbackPayoutBreakdown => {
  const parsed = safeParseBigNumber(balance ?? 0);
  const available = parsed.isFinite() && parsed.gt(0) ? parsed : ZERO;
  if (increment <= 0) {
    return {
      available: available.toNumber(),
      claimable: available.toNumber(),
      remainder: 0,
      progress: 1,
    };
  }
  const steps = available.dividedToIntegerBy(increment);
  const claimable = steps.multipliedBy(increment);
  const remainder = available.minus(claimable);
  return {
    available: available.toNumber(),
    claimable: claimable.toNumber(),
    remainder: remainder.toNumber(),
    progress: remainder.dividedBy(increment).toNumber(),
  };
};

/** Amount string for the claim call: two decimals, never above the balance. */
export const formatClaimAmount = (claimable: number): string =>
  new BigNumber(claimable).decimalPlaces(2, BigNumber.ROUND_FLOOR).toFixed(2);
