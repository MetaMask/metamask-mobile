import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';
import { selectPendingSmartTransactionsBySender } from './smartTransactionsController';

const selectTransactionControllerState = (state: RootState) =>
  state.engine.backgroundState.TransactionController;

const selectTransactionsStrict = createSelector(
  selectTransactionControllerState,
  (transactionControllerState) => transactionControllerState.transactions,
);

export const selectTransactions = createDeepEqualSelector(
  selectTransactionsStrict,
  (transactions) => transactions,
);

export const selectNonReplacedTransactions = createDeepEqualSelector(
  selectTransactionsStrict,
  (transactions) =>
    transactions.filter((tx) => !(tx.replacedBy && tx.replacedById && tx.hash)),
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

export const selectSortedTransactions = createDeepEqualSelector(
  [selectNonReplacedTransactions, selectPendingSmartTransactionsBySender],
  (nonReplacedTransactions, pendingSmartTransactions) =>
    [...nonReplacedTransactions, ...pendingSmartTransactions].sort(
      (a, b) => (b?.time ?? 0) - (a?.time ?? 0),
    ),
);
