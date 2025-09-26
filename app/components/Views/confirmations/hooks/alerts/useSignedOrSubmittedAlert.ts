import { useMemo } from 'react';
import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';

import { useSelector } from 'react-redux';
import { selectTransactions } from '../../../../../selectors/transactionController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

const BLOCK_STATUS = [TransactionStatus.signed, TransactionStatus.approved];

export const useSignedOrSubmittedAlert = () => {
  const transactions = useSelector(selectTransactions);
  const transactionMetadata = useTransactionMetadataRequest();

  const {
    chainId,
    id: transactionId,
    txParams,
    type,
  } = transactionMetadata || {};

  const { from } = txParams ?? {};

  const existingTransaction = transactions.find(
    (transaction) =>
      BLOCK_STATUS.includes(transaction.status) &&
      transaction.id !== transactionId &&
      transaction.chainId === chainId &&
      transaction.txParams.from.toLowerCase() === from?.toLowerCase(),
  );

  const isPerpsDeposit =
    type === TransactionType.perpsDeposit &&
    existingTransaction?.type === TransactionType.perpsDeposit;

  const showAlert = Boolean(existingTransaction);

  return useMemo(() => {
    if (!showAlert) {
      return [];
    }

    return [
      {
        isBlocking: true,
        key: AlertKeys.SignedOrSubmitted,
        message: isPerpsDeposit
          ? strings('alert_system.signed_or_submitted_perps_deposit.message')
          : strings('alert_system.signed_or_submitted.message'),
        title: isPerpsDeposit
          ? strings('alert_system.signed_or_submitted_perps_deposit.title')
          : strings('alert_system.signed_or_submitted.title'),
        severity: Severity.Danger,
      },
    ];
  }, [isPerpsDeposit, showAlert]);
};
