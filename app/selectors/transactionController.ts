import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { createDeepEqualSelector } from './util';

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

export const selectSwapsTransactions = createDeepEqualSelector(
  selectTransactionControllerState,
  (transactionControllerState) =>
    //@ts-expect-error - This is populated at the app level, the TransactionController is not aware of this property
    transactionControllerState.swapsTransactions ?? {},
);
