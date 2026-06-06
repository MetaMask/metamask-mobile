import { useMemo } from 'react';
import { Alert } from '../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { useMMPayHardwareAccountAlert } from './useMMPayHardwareAccountAlert';
import { useInsufficientPredictBalanceAlert } from './useInsufficientPredictBalanceAlert';
import { useInsufficientPerpsBalanceAlert } from './useInsufficientPerpsBalanceAlert';
import { useInsufficientMoneyAccountBalanceAlert } from './useInsufficientMoneyAccountBalanceAlert';
import { useFiatBuyLimitAlert } from './useFiatBuyLimitAlert';
import { useAccountNoFundsAlert } from './useAccountNoFundsAlert';

export function usePendingAmountAlerts({
  pendingTokenAmount,
}: {
  pendingTokenAmount: string | undefined;
}): Alert[] {
  const insufficientTokenFundsAlert = useInsufficientPayTokenBalanceAlert({
    pendingAmountUsd: pendingTokenAmount,
  });

  const mmPayHardwareAccountAlert = useMMPayHardwareAccountAlert();

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

  const fiatBuyLimitAlert = useFiatBuyLimitAlert();

  const accountNoFundsAlert = useAccountNoFundsAlert();

  return useMemo(
    () => [
      ...mmPayHardwareAccountAlert,
      ...insufficientTokenFundsAlert,
      ...insufficientPredictBalanceAlert,
      ...insufficientPerpsBalanceAlert,
      ...insufficientMoneyAccountBalanceAlert,
      ...fiatBuyLimitAlert,
      ...accountNoFundsAlert,
    ],
    [
      insufficientTokenFundsAlert,
      mmPayHardwareAccountAlert,
      insufficientPredictBalanceAlert,
      insufficientPerpsBalanceAlert,
      insufficientMoneyAccountBalanceAlert,
      fiatBuyLimitAlert,
      accountNoFundsAlert,
    ],
  );
}
