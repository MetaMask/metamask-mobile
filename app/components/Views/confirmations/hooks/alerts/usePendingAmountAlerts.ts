import { useMemo } from 'react';
import { usePerpsDepositMinimumAlert } from './usePerpsDepositMinimumAlert';
import { Alert } from '../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { usePerpsHardwareAccountAlert } from './usePerpsHardwareAccountAlert';
import { ARBITRUM_USDC_ADDRESS } from '../../constants/perps';

export function usePendingAmountAlerts({
  pendingTokenAmount,
}: {
  pendingTokenAmount: string | undefined;
}): Alert[] {
  const perpsDepositMinimumAlert = usePerpsDepositMinimumAlert({
    pendingTokenAmount: pendingTokenAmount ?? '0',
  });

  const insufficientTokenFundsAlert = useInsufficientPayTokenBalanceAlert({
    amountOverrides: {
      [ARBITRUM_USDC_ADDRESS.toLowerCase()]: pendingTokenAmount ?? '0',
    },
  });

  const perpsHardwareAccountAlert = usePerpsHardwareAccountAlert();

  return useMemo(
    () => [
      ...perpsHardwareAccountAlert,
      ...perpsDepositMinimumAlert,
      ...insufficientTokenFundsAlert,
    ],
    [
      insufficientTokenFundsAlert,
      perpsDepositMinimumAlert,
      perpsHardwareAccountAlert,
    ],
  );
}
