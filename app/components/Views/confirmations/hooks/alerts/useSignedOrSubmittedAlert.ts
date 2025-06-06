import { useMemo } from 'react';
import { TransactionStatus } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';

import { useSelector } from 'react-redux';
import { selectTransactions } from '../../../../../selectors/transactionController';

const signedOrSubmittedStatuses = [
  TransactionStatus.signed,
  TransactionStatus.submitted,
];

export const useSignedOrSubmittedAlert = () => {
  const transactions = useSelector(selectTransactions);

  return useMemo(() => {
    const showAlert = transactions.some((transaction) =>
      signedOrSubmittedStatuses.includes(transaction.status),
    );

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
  }, [transactions]);
};
