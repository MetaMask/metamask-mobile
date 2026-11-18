import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { Alert, NO_ALERTS, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { isWatchOnlyAccount } from '../../../../../util/address';
import { isWatchOnlyAccountsBuildEnabled } from '../../../../../constants/featureFlags';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';

/**
 * Blocks any confirmation (transaction or signature) whose signing account is
 * held by the development-only watch-only keyring, which cannot sign. Accounts
 * on any other keyring (HD, hardware, Money Account) never raise it.
 */
export function useWatchOnlyAccountAlert(): Alert[] {
  const { approvalRequest } = useApprovalRequest();
  const payingAccount = useTransactionPayingAccount();

  const fromAddress =
    payingAccount || (approvalRequest?.requestData?.from as string | undefined);

  return useMemo(() => {
    if (
      !isWatchOnlyAccountsBuildEnabled() ||
      !fromAddress ||
      !isWatchOnlyAccount(fromAddress)
    ) {
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
