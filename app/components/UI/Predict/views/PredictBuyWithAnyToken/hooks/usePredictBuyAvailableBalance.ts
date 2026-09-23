import { useMemo } from 'react';
import { useIsMoneyAccountPaymentOverride } from '../../../../../Views/confirmations/hooks/pay/useIsMoneyAccountPaymentOverride';
import { useMoneyAccountPayBalance } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayBalance';
import { useTransactionPayToken } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';

export const usePredictBuyAvailableBalance = () => {
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const { data: balance = 0, isLoading: isBalanceLoading } =
    usePredictBalance();
  const { payToken } = useTransactionPayToken();
  const isMoneyAccountSelected = useIsMoneyAccountPaymentOverride();
  const { balanceUsd: moneyAccountBalanceUsd } = useMoneyAccountPayBalance();

  const availableBalance = useMemo(() => {
    if (isPredictBalanceSelected || !payToken) {
      return balance;
    }

    // Paying from the Money Account draws on redeemable mUSD, which is not a
    // wallet token balance, so the pay token snapshot would read the EOA.
    if (isMoneyAccountSelected) {
      return moneyAccountBalanceUsd;
    }

    return Number(payToken?.balanceUsd ?? 0);
  }, [
    isPredictBalanceSelected,
    payToken,
    balance,
    isMoneyAccountSelected,
    moneyAccountBalanceUsd,
  ]);

  return {
    availableBalance,
    isBalanceLoading,
    isPredictBalanceSelected,
  };
};
