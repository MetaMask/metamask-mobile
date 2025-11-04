import { useMemo } from 'react';
import { usePerpsDepositMinimumAlert } from './usePerpsDepositMinimumAlert';
import { Alert } from '../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { usePerpsHardwareAccountAlert } from './usePerpsHardwareAccountAlert';
import { useTransactionRequiredTokens } from '../pay/useTransactionRequiredTokens';
import { getNativeTokenAddress } from '../../utils/asset';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { Hex } from '@metamask/utils';
import { useInsufficientPredictBalanceAlert } from './useInsufficientPredictBalanceAlert';

export function usePendingAmountAlerts({
  pendingTokenAmount,
}: {
  pendingTokenAmount: string | undefined;
}): Alert[] {
  const { chainId } = useTransactionMetadataRequest() || { chainId: '0x0' };
  const requiredTokens = useTransactionRequiredTokens();
  const nativeTokenAddress = getNativeTokenAddress(chainId as Hex);

  const perpsDepositMinimumAlert = usePerpsDepositMinimumAlert({
    pendingTokenAmount: pendingTokenAmount ?? '0',
  });

  const insufficientPredictBalanceAlert = useInsufficientPredictBalanceAlert({
    pendingAmount: pendingTokenAmount,
  });

  const tokenAddress =
    requiredTokens.find((t) => t.address.toLowerCase() !== nativeTokenAddress)
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
