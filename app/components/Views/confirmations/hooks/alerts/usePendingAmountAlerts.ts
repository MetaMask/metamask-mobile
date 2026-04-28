import { useMemo } from 'react';
import { Alert } from '../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { usePerpsHardwareAccountAlert } from './usePerpsHardwareAccountAlert';
import { useInsufficientPredictBalanceAlert } from './useInsufficientPredictBalanceAlert';
import { useInsufficientPerpsBalanceAlert } from './useInsufficientPerpsBalanceAlert';
import { useInsufficientMoneyAccountBalanceAlert } from './useInsufficientMoneyAccountBalanceAlert';
import { useAccountNoFundsAlert } from './useAccountNoFundsAlert';

export function usePendingAmountAlerts({
  pendingTokenAmount,
}: {
  pendingTokenAmount: string | undefined;
}): Alert[] {
  const insufficientTokenFundsAlert = useInsufficientPayTokenBalanceAlert({
    pendingAmountUsd: pendingTokenAmount,
  });

  const perpsHardwareAccountAlert = usePerpsHardwareAccountAlert();

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

  const accountNoFundsAlert = useAccountNoFundsAlert();

  return useMemo(
    () => [
      ...perpsHardwareAccountAlert,
      ...insufficientTokenFundsAlert,
      ...insufficientPredictBalanceAlert,
      ...insufficientPerpsBalanceAlert,
      ...insufficientMoneyAccountBalanceAlert,
      ...accountNoFundsAlert,
    ],
    [
      insufficientTokenFundsAlert,
      perpsHardwareAccountAlert,
      insufficientPredictBalanceAlert,
      insufficientPerpsBalanceAlert,
      insufficientMoneyAccountBalanceAlert,
      accountNoFundsAlert,
    ],
  );
}
