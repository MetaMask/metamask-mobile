import { useMemo } from 'react';
import { Alert, NO_ALERTS, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionCustomAmount } from '../transactions/useTransactionCustomAmount';

export function useClampCommitAlert(): Alert[] {
  const { isClampCommitPending, isClampCommitFailed } =
    useTransactionCustomAmount({});

  return useMemo(() => {
    if (!isClampCommitPending && !isClampCommitFailed) {
      return NO_ALERTS;
    }

    return [
      {
        key: AlertKeys.ClampCommitFailed,
        severity: Severity.Danger,
        isBlocking: true,
        message: isClampCommitFailed
          ? strings('alert_system.clamp_commit_failed.message')
          : strings('alert_system.clamp_commit_pending.message'),
      },
    ];
  }, [isClampCommitPending, isClampCommitFailed]);
}
