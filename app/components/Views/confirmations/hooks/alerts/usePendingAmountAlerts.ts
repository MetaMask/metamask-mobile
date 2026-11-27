import { useMemo } from 'react';
import { Alert } from '../../types/alerts';
import { useInsufficientPayTokenBalanceAlert } from './useInsufficientPayTokenBalanceAlert';
import { useFiatBuyLimitAlert } from './useFiatBuyLimitAlert';
import { useTransactionDepositLimitAlert } from './useTransactionDepositLimitAlert';
import { useAccountNoFundsAlert } from './useAccountNoFundsAlert';
import { useLighterDepositMinimumAlert } from './useLighterDepositMinimumAlert';
import { useLighterWithdrawMinimumAlert } from './useLighterWithdrawMinimumAlert';

export function usePendingAmountAlerts({
  pendingFiatAmount,
}: {
  pendingFiatAmount?: string;
}): Alert[] {
  const insufficientTokenFundsAlert = useInsufficientPayTokenBalanceAlert({
    pendingAmountUsd: pendingFiatAmount ?? '0',
  });

  const fiatBuyLimitAlert = useFiatBuyLimitAlert({
    pendingAmount: pendingFiatAmount,
  });

  const depositLimitAlert = useTransactionDepositLimitAlert({
    pendingAmount: pendingFiatAmount,
  });

  const lighterDepositMinimumAlert = useLighterDepositMinimumAlert({
    pendingAmount: pendingFiatAmount,
  });

  const lighterWithdrawMinimumAlert = useLighterWithdrawMinimumAlert({
    pendingAmount: pendingFiatAmount,
  });

  const accountNoFundsAlert = useAccountNoFundsAlert();

  return useMemo(
    () => [
      ...insufficientTokenFundsAlert,
      ...fiatBuyLimitAlert,
      ...depositLimitAlert,
      ...lighterDepositMinimumAlert,
      ...lighterWithdrawMinimumAlert,
      ...accountNoFundsAlert,
    ],
    [
      insufficientTokenFundsAlert,
      fiatBuyLimitAlert,
      depositLimitAlert,
      lighterDepositMinimumAlert,
      lighterWithdrawMinimumAlert,
      accountNoFundsAlert,
    ],
  );
}
