import { ReactElement, useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { useAlerts } from '../../context/alert-system-context';
import { usePendingAmountAlerts } from '../alerts/usePendingAmountAlerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';

const PENDING_AMOUNT_ALERTS: AlertKeys[] = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.FiatBuyAmountLimit,
  AlertKeys.DepositLimit,
];

const KEYBOARD_ALERTS: AlertKeys[] = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.SignedOrSubmitted,
  AlertKeys.MMPayHardwareAccount,
  AlertKeys.FiatBuyAmountLimit,
  AlertKeys.DepositLimit,
];

const ON_CHANGE_ALERTS = [
  AlertKeys.PerpsDepositMinimum,
  AlertKeys.InsufficientPayTokenBalance,
  AlertKeys.FiatBuyAmountLimit,
  AlertKeys.DepositLimit,
];

export function useTransactionCustomAmountAlerts({
  isInputChanged,
  isKeyboardVisible,
  pendingFiatAmount,
  isClampCommitPending,
  isClampCommitFailed,
}: {
  isInputChanged: boolean;
  isKeyboardVisible: boolean;
  pendingFiatAmount?: string;
  isClampCommitPending?: boolean;
  isClampCommitFailed?: boolean;
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
    // An alert evaluated from the pending amount can also be registered as a
    // confirmation alert (deposit and fiat buy limits are both), which would
    // otherwise surface the same key twice. Keep the pending copy, which is
    // derived from the amount currently on the keypad.
    const seenKeys = new Set<string>();
    const merged = [...pendingTokenAlerts, ...filteredAlerts].filter((a) => {
      if (seenKeys.has(a.key)) {
        return false;
      }
      seenKeys.add(a.key);
      return true;
    });

    // Inject clamp commit alert when pending or failed
    if (isClampCommitPending || isClampCommitFailed) {
      merged.unshift({
        key: 'clamp-commit-status',
        severity: Severity.Danger,
        isBlocking: true,
        message: isClampCommitFailed
          ? strings('alert_system.clamp_commit_failed.message')
          : strings('alert_system.clamp_commit_pending.message'),
      });
    }

    // The hardware wallet alert can only be fixed by switching accounts, so
    // its message takes priority over amount-level alerts.
    return [
      ...merged.filter((a) => a.key === AlertKeys.MMPayHardwareAccount),
      ...merged.filter((a) => a.key !== AlertKeys.MMPayHardwareAccount),
    ];
  }, [
    filteredAlerts,
    pendingTokenAlerts,
    isClampCommitPending,
    isClampCommitFailed,
  ]);

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
