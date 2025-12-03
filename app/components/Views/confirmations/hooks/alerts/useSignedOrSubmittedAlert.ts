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
import { useTransactionPayToken } from '../pay/useTransactionPayToken';

export const PAY_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

const INCOMPLETE_STATUSES = [
  TransactionStatus.signed,
  TransactionStatus.approved,
];
const PENDING_STATUSES = [...INCOMPLETE_STATUSES, TransactionStatus.submitted];

export const useSignedOrSubmittedAlert = () => {
  const transactions = useSelector(selectTransactions);
  const transactionMetadata = useTransactionMetadataRequest();
  const { payToken } = useTransactionPayToken();

  const { chainId, id: transactionId, txParams } = transactionMetadata || {};
  const { from } = txParams ?? {};

  const existingTransaction = transactions.find((transaction) => {
    const blockStatuses = hasTransactionType(transactionMetadata, PAY_TYPES)
      ? PENDING_STATUSES
      : INCOMPLETE_STATUSES;

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

  const hasExistingTransactionOnPayChain =
    payToken &&
    payToken.chainId !== chainId &&
    transactions.some(
      (t) =>
        t.chainId === payToken.chainId &&
        t.txParams.from.toLowerCase() === from?.toLowerCase() &&
        PENDING_STATUSES.includes(t.status),
    );

  const showAlert = Boolean(
    existingTransaction || hasExistingTransactionOnPayChain,
  );

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
          : hasExistingTransactionOnPayChain
            ? strings('alert_system.signed_or_submitted_pay_token.message')
            : strings('alert_system.signed_or_submitted.message'),
        title: isTransactionPay
          ? strings('alert_system.signed_or_submitted_perps_deposit.title')
          : hasExistingTransactionOnPayChain
            ? strings('alert_system.signed_or_submitted_pay_token.title')
            : strings('alert_system.signed_or_submitted.title'),
        severity: Severity.Danger,
      },
    ];
  }, [hasExistingTransactionOnPayChain, isTransactionPay, showAlert]);
};
