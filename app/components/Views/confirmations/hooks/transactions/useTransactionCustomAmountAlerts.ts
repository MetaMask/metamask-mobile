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

  const filteredConfirmationAlerts = useMemo(
    () =>
      confirmationAlerts.filter(
        (a) =>
          a.isBlocking &&
          !PENDING_AMOUNT_ALERTS.includes(a.key as AlertKeys) &&
          (!isKeyboardVisible ||
            KEYBOARD_ALERTS.includes(a.key as AlertKeys)) &&
          (isInputChanged || !ON_CHANGE_ALERTS.includes(a.key as AlertKeys)),
      ),
    [confirmationAlerts, isInputChanged, isKeyboardVisible],
  );

  const alerts = useMemo(
    () => [...pendingTokenAlerts, ...filteredConfirmationAlerts],
    [filteredConfirmationAlerts, pendingTokenAlerts],
  );

  const firstAlert = alerts?.[0];

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
