import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { useAlerts } from '../../context/alert-system-context';
import { usePendingAmountAlerts } from '../alerts/usePendingAmountAlerts';

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
}: {
  isInputChanged: boolean;
  isKeyboardVisible: boolean;
  pendingTokenAmount: string;
}): {
  alertMessage?: string;
  alertTitle?: string;
} {
  const { alerts: confirmationAlerts } = useAlerts();
  const pendingTokenAlerts = usePendingAmountAlerts({ pendingTokenAmount });

  const uniqueAlerts = useMemo(
    () =>
      confirmationAlerts.filter(
        (a_) => !PENDING_AMOUNT_ALERTS.includes(a_.key as AlertKeys),
      ),
    [confirmationAlerts],
  );

  const allAlerts = useMemo(
    () => [...pendingTokenAlerts, ...uniqueAlerts],
    [uniqueAlerts, pendingTokenAlerts],
  );

  const filteredAlerts = useMemo(
    () =>
      allAlerts.filter(
        (a) =>
          a.isBlocking &&
          (!isKeyboardVisible ||
            KEYBOARD_ALERTS.includes(a.key as AlertKeys)) &&
          (isInputChanged || !ON_CHANGE_ALERTS.includes(a.key as AlertKeys)),
      ),
    [allAlerts, isInputChanged, isKeyboardVisible],
  );

  const firstAlert = filteredAlerts?.[0];

  if (!firstAlert) {
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
