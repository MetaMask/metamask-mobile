import { createSelector } from 'reselect';
import type { RootState } from '../../../../reducers';
import { selectFirstPendingApproval } from '../../../../selectors/approvalController';
import { selectTransactions } from '../../../../selectors/transactionController';

/** The pending confirmation's transaction, or the gas-fee modal's override. */
export const selectCurrentTransaction = createSelector(
  [
    selectTransactions,
    (state: RootState, overrideTransactionId?: string | null) =>
      overrideTransactionId ?? selectFirstPendingApproval(state)?.id,
  ],
  (transactions, transactionId) =>
    transactionId === undefined
      ? undefined
      : transactions.find((transaction) => transaction.id === transactionId),
);
