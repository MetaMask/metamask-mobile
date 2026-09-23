import { useMemo } from 'react';
import { useIsMoneyAccountPaymentOverride } from './useIsMoneyAccountPaymentOverride';
import { usePayTokenAccountBalance } from './usePayTokenAccountBalance';
import { useMoneyAccountPayBalance } from './useTransactionPayBalance';

/**
 * Balance the transaction can actually draw on for the selected payment method.
 *
 * Paying from the Money Account is routed through mUSD on Monad, so the
 * pay-token wallet balance describes the EOA rather than the redeemable funds
 * the payment spends. Resolves to the Money Account redeemable while that
 * override is active, and to the live pay-token wallet balance otherwise.
 *
 * Unlike `useTransactionPayBalance` this does not subscribe to the Perps or
 * Predict balance sources, so it is safe to use inside a single product's
 * order view.
 */
export function usePayTokenOrMoneyAccountBalance(): {
  balanceUsd: string;
  balanceRaw: string;
} {
  const isMoneyAccountSelected = useIsMoneyAccountPaymentOverride();
  const walletBalance = usePayTokenAccountBalance();
  const moneyAccountBalance = useMoneyAccountPayBalance();

  return useMemo(
    () =>
      isMoneyAccountSelected
        ? {
            balanceUsd: String(moneyAccountBalance.balanceUsd),
            balanceRaw: moneyAccountBalance.balanceRaw,
          }
        : walletBalance,
    [isMoneyAccountSelected, moneyAccountBalance, walletBalance],
  );
}
