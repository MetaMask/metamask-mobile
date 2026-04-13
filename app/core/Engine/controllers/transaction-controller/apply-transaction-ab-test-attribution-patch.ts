import type { TransactionController } from '@metamask/transaction-controller';

import { registerPendingTransactionActiveAbTestsForTransactionIds } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';

/**
 * Wraps `addTransaction` / `addTransactionBatch` so any pending
 * `active_ab_tests` (see {@link withPendingTransactionActiveAbTests}) are bound
 * to the created transaction meta IDs before metrics run.
 */
export function applyTransactionAbTestAttributionPatch(
  transactionController: TransactionController,
): void {
  const originalAddTransaction = transactionController.addTransaction.bind(
    transactionController,
  );
  const originalAddTransactionBatch =
    transactionController.addTransactionBatch.bind(transactionController);

  transactionController.addTransaction = async (...args) => {
    const result = await originalAddTransaction(...args);
    const id = result?.transactionMeta?.id;
    if (id) {
      registerPendingTransactionActiveAbTestsForTransactionIds([id]);
    }
    return result;
  };

  transactionController.addTransactionBatch = async (...args) => {
    const result = await originalAddTransactionBatch(...args);
    const batchId = result?.batchId;
    if (batchId) {
      const txs = transactionController.getTransactions({
        searchCriteria: { batchId },
      });
      const ids = txs.map((tx) => tx.id).filter(Boolean) as string[];
      if (ids.length > 0) {
        registerPendingTransactionActiveAbTestsForTransactionIds(ids);
      }
    }
    return result;
  };
}
