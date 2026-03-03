import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { strings } from '../../../../../../locales/i18n';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { useAddressTrustSignal } from '../useAddressTrustSignals';
import { TrustSignalDisplayState } from '../../types/trustSignals';

export function useFirstTimeInteractionAlert(): Alert[] {
  const transactionMetadata =
    useTransactionMetadataRequest() as TransactionMeta;
  const internalAccounts = useSelector(selectInternalAccounts);

  const recipient = transactionMetadata?.txParams?.to;
  const chainId = transactionMetadata?.chainId;

  const isInternalAccount = useMemo(() => {
    if (!recipient) {
      return false;
    }
    return internalAccounts.some(
      (account) => account.address?.toLowerCase() === recipient.toLowerCase(),
    );
  }, [internalAccounts, recipient]);

  const trustSignalResult = useAddressTrustSignal(recipient ?? '', chainId);

  const isVerifiedAddress =
    trustSignalResult.state === TrustSignalDisplayState.Verified;

  const isTrustSignalLoading =
    trustSignalResult.state === TrustSignalDisplayState.Loading;

  const isFirstTimeInteraction = transactionMetadata?.isFirstTimeInteraction;

  const showAlert =
    Boolean(recipient) &&
    !isInternalAccount &&
    isFirstTimeInteraction &&
    !isVerifiedAddress &&
    !isTrustSignalLoading;

  return useMemo(() => {
    if (!showAlert) {
      return [];
    }

    return [
      {
        key: AlertKeys.FirstTimeInteraction,
        field: RowAlertKey.FromToAddress,
        severity: Severity.Warning,
        message: strings('alert_system.first_time_interaction.message'),
        title: strings('alert_system.first_time_interaction.title'),
        isBlocking: false,
      },
    ];
  }, [showAlert]);
}
