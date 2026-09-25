import { useMemo } from 'react';
import { AlertKeys } from '../../constants/alerts';
import { Alert, NO_ALERTS, Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';
import { isWatchOnlyAccount } from '../../../../../util/address';
import useApprovalRequest from '../useApprovalRequest';
import { useTransactionPayingAccount } from '../transactions/useTransactionPayingAccount';
import { useTransactionPayFiatPayment } from '../pay/useTransactionPayData';

/**
 * Blocks confirmations whose signer is a key-less watch-only account.
 */
export function useWatchOnlyAccountAlert(): Alert[] {
  const { approvalRequest } = useApprovalRequest();
  const payingAccount = useTransactionPayingAccount();
  const fiatPayment = useTransactionPayFiatPayment();
  // Fiat payments are bought directly to the destination, so the paying
  // account never signs (same exclusion as the hardware-account alert).
  const isFiatPayment = Boolean(fiatPayment?.selectedPaymentMethodId);
  const fromAddress =
    payingAccount || (approvalRequest?.requestData?.from as string);

  return useMemo(() => {
    if (isFiatPayment || !fromAddress || !isWatchOnlyAccount(fromAddress)) {
      return NO_ALERTS;
    }

    return [
      {
        key: AlertKeys.WatchOnlyAccount,
        title: strings('alert_system.watch_only_account.title'),
        message: strings('alert_system.watch_only_account.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ];
  }, [fromAddress, isFiatPayment]);
}
