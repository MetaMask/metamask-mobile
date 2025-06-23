import { useMemo } from 'react';
import { TransactionStatus } from '@metamask/transaction-controller';
import { AlertKeys } from '../../constants/alerts';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';

import { useSelector } from 'react-redux';
import { selectTransactions } from '../../../../../selectors/transactionController';
import { useConfirmationContext } from '../../context/confirmation-context';

const blockableStatuses = [
  TransactionStatus.signed,
  TransactionStatus.approved,
];

export const useSignedOrSubmittedAlert = () => {
  const transactions = useSelector(selectTransactions);
  const { isConfirmationDismounting } = useConfirmationContext();

  return useMemo(() => {
    const showAlert = transactions.some((transaction) =>
      blockableStatuses.includes(transaction.status),
    );

    if (!showAlert || isConfirmationDismounting) {
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
  }, [isConfirmationDismounting, transactions]);
};
