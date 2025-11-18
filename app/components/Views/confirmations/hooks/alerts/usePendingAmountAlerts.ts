import { useMemo } from 'react';
import { Alert } from '../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { usePerpsHardwareAccountAlert } from './usePerpsHardwareAccountAlert';
import { useInsufficientPredictBalanceAlert } from './useInsufficientPredictBalanceAlert';

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

  return useMemo(
    () => [
      ...perpsHardwareAccountAlert,
      ...insufficientTokenFundsAlert,
      ...insufficientPredictBalanceAlert,
    ],
    [
      insufficientTokenFundsAlert,
      perpsHardwareAccountAlert,
      insufficientPredictBalanceAlert,
    ],
  );
}
