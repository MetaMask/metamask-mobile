import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { RootState } from '../../../../../reducers';
import {
  selectTransactionsByBatchId,
  selectTransactionsByIds,
} from '../../../../../selectors/transactionController';
import { hasTransactionType } from '../../utils/transaction';
import { useTransactionDetails } from './useTransactionDetails';

function isSkippedTransaction(
  transaction: TransactionMeta,
  parentTransaction: TransactionMeta,
): boolean {
  return (
    hasTransactionType(parentTransaction, [TransactionType.musdConversion]) &&
    !hasTransactionType(transaction, [TransactionType.relayDeposit])
  );
}

/**
 * Fetches and filters the set of related transactions (batch + required)
 * for the current transaction detail context. Shared between the generic
 * TransactionDetailsSummary and the Money-specific variant.
 */
export function useSummaryTransactions() {
  const { transactionMeta } = useTransactionDetails();
  const {
    batchId,
    id: transactionId,
    metamaskPay,
    requiredTransactionIds,
  } = transactionMeta;

  const batchTransactions = useSelector((state: RootState) =>
    selectTransactionsByBatchId(state, batchId ?? ''),
  );

  const batchTransactionIds = useMemo(
    () =>
      batchTransactions
        .filter((transaction) => transaction.id !== transactionId)
        .map((transaction) => transaction.id),
    [batchTransactions, transactionId],
  );

  const transactionIds = useMemo(
    () => [
      ...(requiredTransactionIds ?? []),
      ...(batchTransactionIds ?? []),
      transactionId,
    ],
    [requiredTransactionIds, batchTransactionIds, transactionId],
  );

  const allTransactions = useSelector((state: RootState) =>
    selectTransactionsByIds(state, transactionIds),
  );

  const transactions = allTransactions.filter(
    (transaction) =>
      !isSkippedTransaction(transaction, transactionMeta) ||
      transaction.id === transactionId,
  );

  const hasDepositTransactions =
    (requiredTransactionIds?.length ?? 0) > 0 || batchTransactionIds.length > 0;

  const { sourceHash, fiat } = metamaskPay ?? {};
  const { orderId: fiatOrderId } = fiat ?? {};

  return {
    transactionMeta,
    transactions,
    hasDepositTransactions,
    sourceHash,
    fiatOrderId,
  };
}
