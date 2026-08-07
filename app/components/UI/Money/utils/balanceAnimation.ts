import { DUST_THRESHOLD } from './moneyFormatFiat';

/** Fraction digits the Money balance is rendered with. */
export const MONEY_BALANCE_FRACTION_DIGITS = 2;

/**
 * Collapses sub-cent dust to zero and rounds to the rendered precision, so two
 * amounts compare equal exactly when they would render as the same text.
 *
 * @param amount - The raw dollar amount.
 * @returns The amount at rendered precision.
 */
export const toDisplayAmount = (amount: number): number =>
  Math.abs(amount) < DUST_THRESHOLD
    ? 0
    : Number(amount.toFixed(MONEY_BALANCE_FRACTION_DIGITS));

export interface BalanceAnimationParams {
  nextAmount: number;
  previousAmount: number | undefined;
  isIdentityChange: boolean;
  isInitialResolution: boolean;
  hasPendingUserOp: boolean;
}

/**
 * The balance rolls only for the catch-up on first load and for the user's own
 * deposits and withdrawals. Background polling and share-price drift update it
 * silently, and switching account or currency replaces it outright.
 *
 * @param params - The animation decision inputs.
 * @returns Whether the transition to `nextAmount` should animate.
 */
export const shouldAnimateBalanceChange = ({
  nextAmount,
  previousAmount,
  isIdentityChange,
  isInitialResolution,
  hasPendingUserOp,
}: BalanceAnimationParams): boolean => {
  if (isIdentityChange || previousAmount === undefined) {
    return false;
  }
  if (nextAmount === previousAmount) {
    return false;
  }
  return isInitialResolution || hasPendingUserOp;
};
