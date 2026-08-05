import { strings } from '../../../../../locales/i18n';

export interface IncrementalMarginCheckParams {
  editedNotionalUsd: number;
  currentNotionalUsd: number;
  spendableBalance: number;
  /** Effective leverage for the asset (position/config), not market max. */
  leverage: number;
  reduceOnly?: boolean;
}

/**
 * Insufficient-balance message when an open-order edit increases notional
 * beyond what spendable balance can collateralize at the given leverage.
 * Size decreases and reduce-only closes return an empty string.
 */
export const getIncrementalMarginInsufficientBalanceError = ({
  editedNotionalUsd,
  currentNotionalUsd,
  spendableBalance,
  leverage,
  reduceOnly = false,
}: IncrementalMarginCheckParams): string => {
  if (reduceOnly) {
    return '';
  }

  if (
    !Number.isFinite(editedNotionalUsd) ||
    editedNotionalUsd <= 0 ||
    !Number.isFinite(leverage) ||
    leverage <= 0
  ) {
    return '';
  }

  const additionalNotionalUsd = editedNotionalUsd - currentNotionalUsd;
  if (additionalNotionalUsd <= 0) {
    return '';
  }

  const availableBalance = Number.isFinite(spendableBalance)
    ? spendableBalance
    : 0;
  const additionalMarginRequired = additionalNotionalUsd / leverage;
  if (additionalMarginRequired > availableBalance) {
    return strings('perps.order.validation.insufficient_balance', {
      required: additionalMarginRequired.toFixed(2),
      available: availableBalance.toString(),
    });
  }

  return '';
};
