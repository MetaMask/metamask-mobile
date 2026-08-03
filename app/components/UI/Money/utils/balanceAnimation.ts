import { DUST_THRESHOLD } from './moneyFormatFiat';

/** Fraction digits the Money balance is rendered with. */
export const MONEY_BALANCE_FRACTION_DIGITS = 2;

/**
 * Collapses sub-cent dust to zero and rounds to the rendered precision,
 * mirroring the formatter. Two amounts compare equal exactly when they would
 * render as the same text, so "the balance changed" means "the user would see a
 * different number" rather than "any wei moved".
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
  /** Undefined before the first resolved value. */
  previousAmount: number | undefined;
  /** Whether the account or currency in view changed. */
  isIdentityChange: boolean;
  /** Whether this is the first balance since mount or an identity change. */
  isInitialResolution: boolean;
  /** Whether a money-affecting transaction confirmed and is unconsumed. */
  hasPendingUserOp: boolean;
}

/**
 * The balance only rolls for changes the user can attribute to something: the
 * catch-up on first load, and their own deposits and withdrawals. Background
 * polling and vault share-price drift update the figure silently, so the number
 * never moves on its own while being watched.
 *
 * Switching account or currency replaces the figure outright — rolling between
 * two unrelated balances would read as money moving.
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
  // Nothing to roll from on a first ever load.
  if (isIdentityChange || previousAmount === undefined) {
    return false;
  }
  if (nextAmount === previousAmount) {
    return false;
  }
  return isInitialResolution || hasPendingUserOp;
};
