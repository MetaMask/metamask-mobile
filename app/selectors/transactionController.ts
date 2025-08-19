import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectPendingSmartTransactionsBySender } from './smartTransactionsController';
import { TransactionMeta } from '@metamask/transaction-controller';

const selectTransactionControllerState = (state: RootState) =>
  state.engine.backgroundState.TransactionController;

const selectTransactionsStrict = createSelector(
  selectTransactionControllerState,
  (transactionControllerState) => transactionControllerState.transactions,
);

const selectTransactionBatchesStrict = createSelector(
  selectTransactionControllerState,
  (transactionControllerState) => transactionControllerState.transactionBatches,
);

export const selectTransactions = createDeepEqualSelector(
  selectTransactionsStrict,
  (transactions) => transactions,
  {
    devModeChecks: {
      identityFunctionCheck: 'never',
    },
  },
);

export const selectNonReplacedTransactions = createDeepEqualSelector(
  selectTransactionsStrict,
  (transactions) =>
    transactions.filter(
      ({ replacedBy, replacedById, hash }) =>
        !(replacedBy && replacedById && hash),
    ),
);

export const selectSortedTransactions = createDeepEqualSelector(
  [selectNonReplacedTransactions, selectPendingSmartTransactionsBySender],
  (nonReplacedTransactions, pendingSmartTransactions) =>
    [...nonReplacedTransactions, ...pendingSmartTransactions].sort(
      (a, b) => (b?.time ?? 0) - (a?.time ?? 0),
    ),
);

export const selectSwapsTransactions = createSelector(
  selectTransactionControllerState,
  (transactionControllerState) =>
    //@ts-expect-error - This is populated at the app level, the TransactionController is not aware of this property
    transactionControllerState.swapsTransactions ?? {},
);

export const selectTransactionMetadataById = createDeepEqualSelector(
  selectTransactionsStrict,
  (_: RootState, id: string) => id,
  (transactions, id) => transactions.find((tx) => tx.id === id),
);

export const selectTransactionBatchMetadataById = createDeepEqualSelector(
  selectTransactionBatchesStrict,
  (_: RootState, id: string) => id,
  (transactionBatches, id) => transactionBatches?.find((tx) => tx.id === id),
);

export const selectTransactionsByIds = createSelector(
  selectTransactionsStrict,
  (_: RootState, ids: string[]) => ids,
  (transactions, ids) =>
    ids
      .map((id) => transactions.find((tx) => tx.id === id))
      .filter(Boolean) as TransactionMeta[],
);
