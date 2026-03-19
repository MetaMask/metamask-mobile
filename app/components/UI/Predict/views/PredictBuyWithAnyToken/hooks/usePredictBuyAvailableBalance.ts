import { useMemo } from 'react';
import { useTransactionPayToken } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';

export const usePredictBuyAvailableBalance = () => {
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const { data: balance = 0, isLoading: isBalanceLoading } =
    usePredictBalance();
  const { payToken } = useTransactionPayToken();

  const availableBalance = useMemo(
    () =>
      isPredictBalanceSelected || !payToken
        ? balance
        : balance + Number(payToken?.balanceUsd ?? 0),
    [isPredictBalanceSelected, payToken, balance],
  );

  return {
    availableBalance,
    isBalanceLoading,
  };
};
