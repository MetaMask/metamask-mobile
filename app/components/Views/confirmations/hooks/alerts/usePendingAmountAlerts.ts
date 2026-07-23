import { useMemo } from 'react';
import { Alert } from '../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { useInsufficientPredictBalanceAlert } from './useInsufficientPredictBalanceAlert';
import { useInsufficientPerpsBalanceAlert } from './useInsufficientPerpsBalanceAlert';
import { useInsufficientMoneyAccountBalanceAlert } from './useInsufficientMoneyAccountBalanceAlert';
import { useFiatBuyLimitAlert } from './useFiatBuyLimitAlert';
import { useTransactionDepositLimitAlert } from './useTransactionDepositLimitAlert';
import { useAccountNoFundsAlert } from './useAccountNoFundsAlert';

export function usePendingAmountAlerts({
  pendingTokenAmount,
  pendingFiatAmount,
}: {
  pendingTokenAmount: string | undefined;
  pendingFiatAmount?: string;
}): Alert[] {
  const insufficientTokenFundsAlert = useInsufficientPayTokenBalanceAlert({
    pendingAmountUsd: pendingFiatAmount ?? '0',
  });

  const insufficientPredictBalanceAlert = useInsufficientPredictBalanceAlert({
    pendingAmount: pendingTokenAmount ?? '0',
  });

  const insufficientPerpsBalanceAlert = useInsufficientPerpsBalanceAlert({
    pendingAmount: pendingTokenAmount ?? '0',
  });

  const insufficientMoneyAccountBalanceAlert =
    useInsufficientMoneyAccountBalanceAlert({
      pendingAmount: pendingTokenAmount ?? '0',
    });

  const fiatBuyLimitAlert = useFiatBuyLimitAlert({
    pendingAmount: pendingFiatAmount,
  });

  const depositLimitAlert = useTransactionDepositLimitAlert({
    pendingAmount: pendingFiatAmount,
  });

  const accountNoFundsAlert = useAccountNoFundsAlert();

  return useMemo(
    () => [
      ...insufficientTokenFundsAlert,
      ...insufficientPredictBalanceAlert,
      ...insufficientPerpsBalanceAlert,
      ...insufficientMoneyAccountBalanceAlert,
      ...fiatBuyLimitAlert,
      ...depositLimitAlert,
      ...accountNoFundsAlert,
    ],
    [
      insufficientTokenFundsAlert,
      insufficientPredictBalanceAlert,
      insufficientPerpsBalanceAlert,
      insufficientMoneyAccountBalanceAlert,
      fiatBuyLimitAlert,
      depositLimitAlert,
      accountNoFundsAlert,
    ],
  );
}
