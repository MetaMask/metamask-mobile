  /**
   * Filters out redundant incoming transactions that occur immediately after
   * bridge transactions with the same value (after in time is before in the
   * transactions array). This prevents duplicate transaction display when a
   * bridge operation results in both a bridge transaction and an incoming
   * transaction for the same amount.
   *
   * @param {Array<Object>} transactions - Array of transaction objects to
   * filter
   * @param {string} transactions[].type - The type of transaction (e.g.,
   * 'bridge', 'incoming')
   * @param {string} transactions[].id - Unique identifier for the transaction
   * @param {Object} transactions[].txParams - Transaction parameters
   * @param {string} transactions[].txParams.value - The transaction value in
   * wei
   * @returns {Array<Object>} Filtered array of transactions with redundant
   * incoming transactions removed
   */
export const filterRedundantBridgeTransactions = (transactions) => {
  if (!transactions || transactions.length === 0) {
    return transactions;
  }

  const incomingTransactionsToFilter = new Set();

  for (let i = 0; i < transactions.length - 1; i++) {
    const currentTx = transactions[i];

    if (currentTx.type === 'incoming' && currentTx.txParams?.value) {
      const nextTx = transactions[i + 1];

      if (
        nextTx.type === 'bridge' &&
        nextTx.txParams?.value &&
        currentTx.txParams.value === nextTx.txParams.value
      ) {
        incomingTransactionsToFilter.add(currentTx.id);
      }
    }
  }

  return transactions.filter(tx => !incomingTransactionsToFilter.has(tx.id));
};