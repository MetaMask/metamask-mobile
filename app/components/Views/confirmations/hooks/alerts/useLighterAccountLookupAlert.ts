import { useMemo } from 'react';
import { Alert, NO_ALERTS, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { strings } from '../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useLighterAccountLookupState } from '../transactions/useSyncPerpsLighterTransactionType';

/**
 * Alert that blocks confirmation while looking up the Lighter account or if
 * the lookup fails.
 *
 * @returns Alert array.
 */
export function useLighterAccountLookupAlert(): Alert[] {
  const transactionMeta = useTransactionMetadataRequest();
  const { isPending, error } = useLighterAccountLookupState(
    transactionMeta?.id,
  );

  return useMemo(() => {
    if (isPending) {
      return [
        {
          key: AlertKeys.LighterAccountLookupPending,
          severity: Severity.Info,
          message: strings(
            'alert_system.lighter_account_lookup_pending.message',
          ),
          isBlocking: true,
        },
      ];
    }

    if (error) {
      return [
        {
          key: AlertKeys.LighterAccountLookupFailed,
          severity: Severity.Danger,
          message:
            strings('alert_system.lighter_account_lookup_failed.message') ??
            'Failed to verify Lighter account',
          isBlocking: true,
        },
      ];
    }

    return NO_ALERTS;
  }, [isPending, error]);
}
