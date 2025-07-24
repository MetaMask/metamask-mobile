import { TransactionMeta } from '@metamask/transaction-controller';

/**
 * Filters out redundant incoming transactions that occur immediately before
 * outgoing transactions with the same hash. This prevents duplicate transaction display.
 *
 * @param transactions - Array of transaction objects to filter.
 * @returns Filtered array of transactions with redundant incoming transactions removed.
 */
export const filterDuplicateOutgoingTransactions = (
  transactions: TransactionMeta[],
): TransactionMeta[] => {
  if (!transactions || transactions.length === 0) {
    return transactions;
  }

  return transactions.filter((currentTx, currentIndex) => {
    if (!currentTx.hash) {
      return true; // Keep transactions without a hash
    }

    // Check if a transaction with the same hash exists later in the array
    const laterIndex = transactions.findIndex(
      (tx, index) =>
        tx.hash?.toLowerCase() === currentTx.hash?.toLowerCase() &&
        index > currentIndex,
    );

    return laterIndex === -1; // Keep the transaction if no later matching transaction exists
  });
};
