import { useMemo } from 'react';
import { usePerpsDepositMinimumAlert } from './usePerpsDepositMinimumAlert';
import { Alert } from '../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { usePerpsHardwareAccountAlert } from './usePerpsHardwareAccountAlert';
import { useTransactionRequiredTokens } from '../pay/useTransactionRequiredTokens';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';

export function usePendingAmountAlerts({
  pendingTokenAmount,
}: {
  pendingTokenAmount: string | undefined;
}): Alert[] {
  const perpsDepositMinimumAlert = usePerpsDepositMinimumAlert({
    pendingTokenAmount: pendingTokenAmount ?? '0',
  });

  const requiredTokens = useTransactionRequiredTokens();

  const tokenAddress =
    requiredTokens.find((t) => t.address.toLowerCase() !== NATIVE_TOKEN_ADDRESS)
      ?.address ?? '0x0';

  const insufficientTokenFundsAlert = useInsufficientPayTokenBalanceAlert({
    amountOverrides: {
      [tokenAddress.toLowerCase()]: pendingTokenAmount ?? '0',
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
