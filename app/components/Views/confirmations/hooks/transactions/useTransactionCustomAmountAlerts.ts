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

export const ON_CHANGE_ALERTS = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.InsufficientPredictBalance,
];

export function useTransactionCustomAmountAlerts({
  isInputChanged,
  pendingTokenAmount,
}: {
  isInputChanged: boolean;
  pendingTokenAmount: string;
}) {
  const { alerts: confirmationAlerts } = useAlerts();
  const pendingTokenAlerts = usePendingAmountAlerts({ pendingTokenAmount });

  const filteredConfirmationAlerts = useMemo(
    () =>
      confirmationAlerts.filter(
        (a) => !PENDING_AMOUNT_ALERTS.includes(a.key as AlertKeys),
      ),
    [confirmationAlerts],
  );

  const alerts = useMemo(
    () =>
      [...pendingTokenAlerts, ...filteredConfirmationAlerts].filter((a) =>
        KEYBOARD_ALERTS.includes(a.key as AlertKeys),
      ),
    [filteredConfirmationAlerts, pendingTokenAlerts],
  );

  const firstAlert = alerts?.[0];

  const hasAlert =
    Boolean(firstAlert) &&
    (!ON_CHANGE_ALERTS.includes(firstAlert?.key as AlertKeys) ||
      isInputChanged);

  const keyboardAlertMessage = hasAlert
    ? (firstAlert?.title ?? (firstAlert?.message as string | undefined))
    : undefined;

  const alertMessage =
    hasAlert && firstAlert?.title ? (firstAlert?.message as string) : undefined;

  return {
    alertMessage,
    excludeBannerKeys: KEYBOARD_ALERTS,
    keyboardAlertMessage,
  };
}
