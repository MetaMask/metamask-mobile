import { useMemo } from 'react';
import { usePerpsDepositMinimumAlert } from '../../../hooks/alerts/usePerpsDepositMinimumAlert';
import { Alert } from '../../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from '../../../hooks/alerts/useInsufficientPayTokenBalanceAlert';
import { usePerpsHardwareAccountAlert } from '../../../hooks/alerts/usePerpsHardwareAccountAlert';
import { ARBITRUM_USDC_ADDRESS } from '../../../constants/perps';

export function usePerpsDepositAlerts({
  pendingTokenAmount,
}: {
  pendingTokenAmount: string | undefined;
}): Alert[] {
  const perpsDepositMinimumAlert = usePerpsDepositMinimumAlert({
    pendingTokenAmount: pendingTokenAmount ?? '0',
  });

  const insufficientTokenFundsAlert = useInsufficientPayTokenBalanceAlert({
    amountOverrides: {
      [ARBITRUM_USDC_ADDRESS]: pendingTokenAmount ?? '0',
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
