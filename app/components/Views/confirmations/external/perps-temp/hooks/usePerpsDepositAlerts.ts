import { useMemo } from 'react';
import { usePerpsDepositMinimumAlert } from '../../../hooks/alerts/usePerpsDepositMinimumAlert';
import { Alert } from '../../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from '../../../hooks/alerts/useInsufficientPayTokenBalanceAlert';
import { ARBITRUM_USDC_ADDRESS } from './usePerpsDepositInit';

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

  return useMemo(
    () => [...perpsDepositMinimumAlert, ...insufficientTokenFundsAlert],
    [perpsDepositMinimumAlert, insufficientTokenFundsAlert],
  );
}
