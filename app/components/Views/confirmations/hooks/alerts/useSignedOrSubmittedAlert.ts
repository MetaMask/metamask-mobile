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
import { hasTransactionType } from '../../utils/transaction';

export const PAY_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

const BLOCK_STATUS = [TransactionStatus.signed, TransactionStatus.approved];

export const useSignedOrSubmittedAlert = () => {
  const transactions = useSelector(selectTransactions);
  const transactionMetadata = useTransactionMetadataRequest();
  const { chainId, id: transactionId, txParams } = transactionMetadata || {};
  const { from } = txParams ?? {};

  const existingTransaction = transactions.find((transaction) => {
    const blockStatuses = [...BLOCK_STATUS];

    if (hasTransactionType(transactionMetadata, PAY_TYPES)) {
      blockStatuses.push(TransactionStatus.submitted);
    }

    return (
      blockStatuses.includes(transaction.status) &&
      transaction.id !== transactionId &&
      transaction.chainId === chainId &&
      transaction.txParams.from.toLowerCase() === from?.toLowerCase()
    );
  });

  const isTransactionPay = PAY_TYPES.some(
    (payType) =>
      transactionMetadata &&
      existingTransaction &&
      hasTransactionType(transactionMetadata, [payType]) &&
      hasTransactionType(existingTransaction, [payType]),
  );

  const showAlert = Boolean(existingTransaction);

  return useMemo(() => {
    if (!showAlert) {
      return [];
    }

    return [
      {
        isBlocking: true,
        key: AlertKeys.SignedOrSubmitted,
        message: isTransactionPay
          ? strings('alert_system.signed_or_submitted_perps_deposit.message')
          : strings('alert_system.signed_or_submitted.message'),
        title: isTransactionPay
          ? strings('alert_system.signed_or_submitted_perps_deposit.title')
          : strings('alert_system.signed_or_submitted.title'),
        severity: Severity.Danger,
      },
    ];
  }, [isTransactionPay, showAlert]);
};
