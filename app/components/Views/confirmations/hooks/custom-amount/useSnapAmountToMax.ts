import { useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { useTransactionPayBalance } from '../pay/useTransactionPayBalance';
import { useTransactionPayIsMaxAmount } from '../pay/useTransactionPayData';

export const MM_PAY_AMOUNT_INPUT_TYPE_MANUAL_SNAPPED_MAX = 'manual_snapped_max';

/**
 * Detects manually typed amounts that should be committed as Max.
 *
 * Snaps only when the amount equals the balance as displayed (truncated to
 * cents). Committed literally, that amount is either priced as an exact output,
 * where fees push the source above the balance, or capped below the full
 * balance on post-quote withdraws. Lower amounts are a deliberate choice and
 * higher ones are genuinely insufficient, so neither snaps.
 *
 * @param options - Options bag.
 * @param options.isMaxAvailable - Whether the Max button is offered.
 * @returns `isSnapToMax` to test an amount, and `resolveAmountFiat` mapping a
 * snapping amount to the full-precision balance Max commits, so pending-amount
 * alerts judge the amount that will actually be committed.
 */
export function useSnapAmountToMax({
  isMaxAvailable,
}: {
  isMaxAvailable: boolean;
}): {
  isSnapToMax: (amountFiat: string) => boolean;
  resolveAmountFiat: (amountFiat: string) => string;
} {
  const { balanceUsd } = useTransactionPayBalance();
  const isMaxAmount = useTransactionPayIsMaxAmount();

  const isSnapToMax = useCallback(
    (amountFiat: string) => {
      if (!isMaxAvailable || isMaxAmount) {
        return false;
      }

      const displayedBalance = new BigNumber(balanceUsd).decimalPlaces(
        2,
        BigNumber.ROUND_DOWN,
      );
      const amount = new BigNumber(amountFiat || '0');

      return (
        displayedBalance.isFinite() &&
        displayedBalance.gt(0) &&
        amount.isFinite() &&
        amount.eq(displayedBalance)
      );
    },
    [balanceUsd, isMaxAmount, isMaxAvailable],
  );

  const resolveAmountFiat = useCallback(
    (amountFiat: string) =>
      isSnapToMax(amountFiat)
        ? new BigNumber(balanceUsd).toFixed()
        : amountFiat,
    [balanceUsd, isSnapToMax],
  );

  return { isSnapToMax, resolveAmountFiat };
}
