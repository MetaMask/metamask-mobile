import { ReactElement, useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { useAlerts } from '../../context/alert-system-context';
import { usePendingAmountAlerts } from '../alerts/usePendingAmountAlerts';

const PENDING_AMOUNT_ALERTS: AlertKeys[] = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.FiatBuyAmountLimit,
];

const KEYBOARD_ALERTS: AlertKeys[] = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.SignedOrSubmitted,
  AlertKeys.MMPayHardwareAccount,
  AlertKeys.FiatBuyAmountLimit,
];

const ON_CHANGE_ALERTS = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.FiatBuyAmountLimit,
];

export function useTransactionCustomAmountAlerts({
  isInputChanged,
  isKeyboardVisible,
  pendingFiatAmount,
}: {
  isInputChanged: boolean;
  isKeyboardVisible: boolean;
  pendingFiatAmount?: string;
}): {
  alertContent?: ReactElement;
  alertMessage?: string;
} {
  const { alerts: confirmationAlerts } = useAlerts();
  const pendingTokenAlerts = usePendingAmountAlerts({
    pendingFiatAmount,
  });

  const filteredAlerts = useMemo(() => {
    const relevantAlerts = confirmationAlerts.filter((a) => a.isBlocking);

    return relevantAlerts.filter((a) => {
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

  const alerts = useMemo(() => {
    const merged = [...pendingTokenAlerts, ...filteredAlerts];

    // The hardware wallet alert can only be fixed by switching accounts, so
    // its message takes priority over amount-level alerts.
    return [
      ...merged.filter((a) => a.key === AlertKeys.MMPayHardwareAccount),
      ...merged.filter((a) => a.key !== AlertKeys.MMPayHardwareAccount),
    ];
  }, [filteredAlerts, pendingTokenAlerts]);

  const firstAlert = alerts?.[0];

  if (!firstAlert) {
    return {};
  }

  const alertMessage =
    (firstAlert.message as string | undefined) ?? firstAlert.title;

  const alertContent = firstAlert.content as ReactElement | undefined;

  return {
    alertContent,
    alertMessage,
  };
}
