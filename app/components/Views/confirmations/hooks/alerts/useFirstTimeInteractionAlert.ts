import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Alert, Severity } from '../../types/alerts';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { strings } from '../../../../../../locales/i18n';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { useAddressTrustSignals } from '../useAddressTrustSignals';
import {
  TrustSignalDisplayState,
  AddressTrustSignalRequest,
} from '../../types/trustSignals';

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

  const addressesToScan = useMemo((): AddressTrustSignalRequest[] => {
    if (!chainId || !recipient) {
      return [];
    }
    return [
      {
        address: recipient,
        chainId,
      },
    ];
  }, [recipient, chainId]);

  const trustSignalResults = useAddressTrustSignals(addressesToScan);

  const isVerifiedAddress = useMemo(() => {
    if (trustSignalResults.length === 0) {
      return false;
    }
    const result = trustSignalResults[0];
    return result.state === TrustSignalDisplayState.Verified;
  }, [trustSignalResults]);

  const isTrustSignalLoading = useMemo(() => {
    if (trustSignalResults.length === 0) {
      return false;
    }
    return trustSignalResults[0].state === TrustSignalDisplayState.Loading;
  }, [trustSignalResults]);

  const isFirstTimeInteraction = transactionMetadata?.isFirstTimeInteraction;

  const showAlert =
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
