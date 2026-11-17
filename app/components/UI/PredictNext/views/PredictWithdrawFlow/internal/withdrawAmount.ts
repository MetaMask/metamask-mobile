import type { PredictAmount } from '../../../types';

/**
 * The venue's minimum withdrawal, in USD. Mirrors the API's
 * `422 amount_below_minimum` threshold, so an amount this screen lets through
 * is never refused by the backend for being too small.
 */
export const MINIMUM_WITHDRAW_AMOUNT = 1;

/** Digits with at most two decimals and at most nine whole digits: the shape
 * the API accepts for a `fixed` amount. */
const AMOUNT_PATTERN = /^\d{1,9}(\.\d{1,2})?$/u;

/**
 * Why a typed amount cannot be withdrawn. `null` when it can, including while
 * the field is empty: an empty field is not yet an error.
 */
export type PredictWithdrawAmountIssue = 'below_minimum' | 'over_balance' | null;

/**
 * Judges a typed amount against the minimum and the available balance. A
 * balance that has not loaded cannot be exceeded, so only the minimum applies.
 */
export const withdrawAmountIssue = (
  amount: string,
  availableBalance?: PredictAmount,
): PredictWithdrawAmountIssue => {
  if (amount.length === 0) {
    return null;
  }
  if (!AMOUNT_PATTERN.test(amount)) {
    return Number(amount) < MINIMUM_WITHDRAW_AMOUNT
      ? 'below_minimum'
      : 'over_balance';
  }
  if (Number(amount) < MINIMUM_WITHDRAW_AMOUNT) {
    return 'below_minimum';
  }
  if (
    availableBalance !== undefined &&
    Number(amount) > Number(availableBalance)
  ) {
    return 'over_balance';
  }
  return null;
};

/**
 * Why the whole available balance cannot be swept. A sweep is refused only by
 * the Venue's own floor, since the amount is the balance itself; an unknown
 * balance is not a judgement (the button that sweeps stays disabled).
 */
export const sweepWithdrawAmountIssue = (
  availableBalance?: PredictAmount,
): PredictWithdrawAmountIssue => {
  if (
    availableBalance !== undefined &&
    Number(availableBalance) < MINIMUM_WITHDRAW_AMOUNT
  ) {
    return 'below_minimum';
  }
  return null;
};

/**
 * Keeps the field to a withdrawable shape while it is typed: digits, one
 * decimal point, at most two decimals, no leading zeros.
 */
export const sanitizeWithdrawAmount = (next: string): string => {
  const cleaned = next.replace(/[^0-9.]/gu, '');
  const dotIndex = cleaned.indexOf('.');
  const whole = (dotIndex === -1 ? cleaned : cleaned.slice(0, dotIndex))
    .slice(0, 9)
    .replace(/^0+(?=\d)/u, '');
  if (dotIndex === -1) {
    return whole;
  }
  const decimals = cleaned
    .slice(dotIndex + 1)
    .replace(/\./gu, '')
    .slice(0, 2);
  return `${whole.length > 0 ? whole : '0'}.${decimals}`;
};
