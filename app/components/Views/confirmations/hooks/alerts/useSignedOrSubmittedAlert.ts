import { useMemo } from 'react';
import { TransactionStatus } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';

import { useSelector } from 'react-redux';
import { selectTransactions } from '../../../../../selectors/transactionController';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

const blockableStatuses = [
  TransactionStatus.signed,
  TransactionStatus.approved,
];

export const useSignedOrSubmittedAlert = () => {
  const transactions = useSelector(selectTransactions);
  const transactionMetadata = useTransactionMetadataRequest();

  return useMemo(() => {
    const showAlert = transactions
      .filter((transaction) => transaction.id !== transactionMetadata?.id)
      .some((transaction) => blockableStatuses.includes(transaction.status));

    if (!showAlert) {
      return [];
    }

    return [
      {
        isBlocking: true,
        key: AlertKeys.SignedOrSubmitted,
        message: strings('alert_system.signed_or_submitted.message'),
        severity: Severity.Danger,
      },
    ];
  }, [transactions, transactionMetadata]);
};
