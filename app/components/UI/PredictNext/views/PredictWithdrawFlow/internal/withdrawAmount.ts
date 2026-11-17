import type { PredictAmount } from '../../../types';

/**
 * The venue's minimum withdrawal, in USD. Mirrors the API's
 * `422 amount_below_minimum` threshold, so an amount this screen lets through
 * is never refused by the backend for being too small.
 */
export const MINIMUM_WITHDRAW_AMOUNT = 1;

/** One dollar in cents: every judgement below is integer arithmetic. */
const MINIMUM_WITHDRAW_CENTS = MINIMUM_WITHDRAW_AMOUNT * 100;

/** Digits with at most two decimals and at most nine whole digits: the shape
 * the API accepts for a `fixed` amount. A trailing dot is a valid in-progress
 * entry (`10.`), so it is allowed here and removed by
 * {@link normalizeWithdrawAmount} before the amount leaves the phone. */
const AMOUNT_PATTERN = /^\d{1,9}(\.\d{0,2})?$/u;

/**
 * Why a typed amount cannot be withdrawn. `null` when it can, including while
 * the field is empty: an empty field is not yet an error.
 */
export type PredictWithdrawAmountIssue =
  | 'below_minimum'
  | 'over_balance'
  | null;

/**
 * Money as integer cents. `null` when the value is not a decimal money
 * amount, so an unparseable input is never silently rounded into a judgement.
 */
const parseCents = (amount: string): number | null => {
  if (!AMOUNT_PATTERN.test(amount)) {
    return null;
  }
  const [whole, decimals = ''] = amount.split('.');
  return Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
};

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
  const cents = parseCents(amount);
  if (cents === null) {
    return Number(amount) < MINIMUM_WITHDRAW_AMOUNT
      ? 'below_minimum'
      : 'over_balance';
  }
  if (cents < MINIMUM_WITHDRAW_CENTS) {
    return 'below_minimum';
  }
  const balanceCents =
    availableBalance === undefined ? null : parseCents(availableBalance);
  if (balanceCents !== null && cents > balanceCents) {
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
  const balanceCents =
    availableBalance === undefined ? null : parseCents(availableBalance);
  if (balanceCents !== null && balanceCents < MINIMUM_WITHDRAW_CENTS) {
    return 'below_minimum';
  }
  return null;
};

/**
 * The amount in the shape the API accepts. A trailing dot is still a valid
 * entry while the person types decimals, so it is only removed when the value
 * is sent.
 */
export const normalizeWithdrawAmount = (amount: string): string =>
  amount.endsWith('.') ? amount.slice(0, -1) : amount;

/**
 * Keeps the field to a withdrawable shape while it is typed: digits, one
 * decimal point, at most two decimals, no leading zeros. A trailing dot is
 * kept so the next digit types a decimal.
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
