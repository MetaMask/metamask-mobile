import { useMemo } from 'react';
import { usePerpsDepositMinimumAlert } from './usePerpsDepositMinimumAlert';
import { Alert } from '../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { usePerpsHardwareAccountAlert } from './usePerpsHardwareAccountAlert';
import { useInsufficientPredictBalanceAlert } from './useInsufficientPredictBalanceAlert';

export function usePendingAmountAlerts({
  pendingTokenAmount,
}: {
  pendingTokenAmount: string | undefined;
}): Alert[] {
  const perpsDepositMinimumAlert = usePerpsDepositMinimumAlert({
    pendingTokenAmount: pendingTokenAmount ?? '0',
  });

  const insufficientTokenFundsAlert = useInsufficientPayTokenBalanceAlert({
    amountFiatOverride: pendingTokenAmount,
  });

  const perpsHardwareAccountAlert = usePerpsHardwareAccountAlert();

  const insufficientPredictBalanceAlert = useInsufficientPredictBalanceAlert({
    pendingAmount: pendingTokenAmount ?? '0',
  });

  return useMemo(
    () => [
      ...perpsHardwareAccountAlert,
      ...perpsDepositMinimumAlert,
      ...insufficientTokenFundsAlert,
      ...insufficientPredictBalanceAlert,
    ],
    [
      insufficientTokenFundsAlert,
      perpsDepositMinimumAlert,
      perpsHardwareAccountAlert,
      insufficientPredictBalanceAlert,
    ],
  );
}
