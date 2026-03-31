import { useMemo } from 'react';
import { formatPrice } from '../../../utils/format';
import { usePredictBalance } from '../../../hooks/usePredictBalance';
import { usePredictPaymentToken } from '../../../hooks/usePredictPaymentToken';
import { useTransactionPayToken } from '../../../../../Views/confirmations/hooks/pay/useTransactionPayToken';

export const usePredictBuyAvailableBalance = () => {
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const { data: balance = 0, isLoading: isBalanceLoading } =
    usePredictBalance();
  const { payToken } = useTransactionPayToken();

  const availableBalance = useMemo(
    () =>
      isPredictBalanceSelected
        ? formatPrice(balance, {
            minimumDecimals: 2,
            maximumDecimals: 2,
          })
        : `$${Number(payToken?.balanceUsd ?? 0).toFixed(2)}`,
    [isPredictBalanceSelected, balance, payToken?.balanceUsd],
  );

  return {
    availableBalance,
    isBalanceLoading,
  };
};
