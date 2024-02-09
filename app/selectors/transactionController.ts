import { createSelector } from 'reselect';
import { RootState } from '../reducers';

const selectTransationControllerState = (state: RootState) =>
  state.engine.backgroundState.TransactionController;

// eslint-disable-next-line import/prefer-default-export
export const selectTransactions = createSelector(
  selectTransationControllerState,
  (transactionControllerState) => transactionControllerState.transactions,
);
