import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { Alert, NO_ALERTS, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { isWatchOnlyAccount } from '../../../../../util/address';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';

/**
 * Blocks any confirmation (transaction or signature) whose signing account is
 * a development-only watch-only account, which has no signing capability.
 */
export function useWatchOnlyAccountAlert(): Alert[] {
  const { approvalRequest } = useApprovalRequest();
  const payingAccount = useTransactionPayingAccount();

  const fromAddress =
    payingAccount || (approvalRequest?.requestData?.from as string | undefined);

  return useMemo(() => {
    if (!fromAddress || !isWatchOnlyAccount(fromAddress)) {
      return NO_ALERTS;
    }

    return [
      {
        key: AlertKeys.WatchOnlyAccount,
        title: strings('watch_only.blocked_title'),
        message: strings('watch_only.blocked_message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [fromAddress]);
}
