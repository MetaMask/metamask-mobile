import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { useAlerts } from '../../context/alert-system-context';
import { usePendingAmountAlerts } from '../alerts/usePendingAmountAlerts';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { hasTransactionType } from '../../utils/transaction';
import { TransactionType } from '@metamask/transaction-controller';
import { Alert } from '../../types/alerts';

const PENDING_AMOUNT_ALERTS: AlertKeys[] = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.InsufficientPredictBalance,
];

const KEYBOARD_ALERTS: AlertKeys[] = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.SignedOrSubmitted,
  AlertKeys.PerpsHardwareAccount,
  AlertKeys.InsufficientPredictBalance,
];

const ON_CHANGE_ALERTS = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.InsufficientPredictBalance,
];

export function useTransactionCustomAmountAlerts({
  isInputChanged,
  isKeyboardVisible,
  pendingTokenAmount,
  hasMax,
}: {
  isInputChanged: boolean;
  isKeyboardVisible: boolean;
  pendingTokenAmount: string;
  hasMax?: boolean;
}): {
  alertMessage?: string;
  alertTitle?: string;
} {
  const { alerts: confirmationAlerts } = useAlerts();
  const pendingTokenAlerts = usePendingAmountAlerts({ pendingTokenAmount });
  const transactionMeta = useTransactionMetadataRequest();

  const shouldBypassInsufficientPayTokenBalance = (a: Alert) =>
    hasMax &&
    hasTransactionType(transactionMeta, [TransactionType.musdConversion]) &&
    a.key === AlertKeys.InsufficientPayTokenBalance;

  const filteredAlerts = useMemo(() => {
    const blockingAlerts = confirmationAlerts.filter((a) => a.isBlocking);

    return blockingAlerts.filter((a) => {
      const isIgnoredAsNoInput =
        !isInputChanged && ON_CHANGE_ALERTS.includes(a.key as AlertKeys);

      const isIgnoredAsKeyboardVisible =
        isKeyboardVisible && !KEYBOARD_ALERTS.includes(a.key as AlertKeys);

      const isIgnoredAsPending =
        isKeyboardVisible && PENDING_AMOUNT_ALERTS.includes(a.key as AlertKeys);

      return (
        !isIgnoredAsNoInput &&
        !isIgnoredAsKeyboardVisible &&
        !isIgnoredAsPending
      );
    });
  }, [confirmationAlerts, isInputChanged, isKeyboardVisible]);

  const alerts = useMemo(
    () => [...pendingTokenAlerts, ...filteredAlerts],
    [filteredAlerts, pendingTokenAlerts],
  );

  const firstAlert = alerts?.[0];

  if (!firstAlert || shouldBypassInsufficientPayTokenBalance(firstAlert)) {
    return {};
  }

  const alertTitle =
    firstAlert.title ?? (firstAlert.message as string | undefined);

  const alertMessage = firstAlert.title
    ? (firstAlert.message as string | undefined)
    : undefined;

  return {
    alertMessage,
    alertTitle,
  };
}
