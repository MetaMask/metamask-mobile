import { useMemo } from 'react';
import { useTransactionPayToken } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { formatPrice } from '../../../utils/format';

export const usePredictBuyAvailableBalance = () => {
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const { data: balance = 0, isLoading: isBalanceLoading } =
    usePredictBalance();
  const { payToken } = useTransactionPayToken();

  const availableBalance = useMemo(
    () =>
      isPredictBalanceSelected || !payToken
        ? formatPrice(balance, {
            minimumDecimals: 2,
            maximumDecimals: 2,
          })
        : `$${Number(payToken?.balanceUsd ?? 0).toFixed(2)}`,
    [isPredictBalanceSelected, payToken, balance],
  );

  return {
    availableBalance,
    isBalanceLoading,
  };
};
