import { createSelector } from 'reselect';
import { selectTransactions } from './transactionController';
import { RootState } from '../reducers';
import {
  selectGasFeeControllerEstimateType,
  selectGasFeeControllerEstimates,
} from './gasFeeController';
import { mergeGasFeeControllerAndTransactionGasFeeEstimates } from '@metamask/transaction-controller';

export const selectCurrentTransaction = (state: RootState) => state.transaction;

export const selectCurrentTransactionMetadata = createSelector(
  selectTransactions,
  selectCurrentTransaction,
  (transactions, currentTransaction) =>
    transactions.find((tx) => tx.id === currentTransaction?.id),
);

export const selectCurrentTransactionGasFeeEstimates = createSelector(
  selectCurrentTransactionMetadata,
  (transactionMetadata) => transactionMetadata?.gasFeeEstimates,
);

export const selectGasFeeEstimates = createSelector(
  selectGasFeeControllerEstimateType,
  selectGasFeeControllerEstimates,
  selectCurrentTransactionGasFeeEstimates,
  (
    gasFeeControllerEstimateType,
    gasFeeControllerEstimates,
    transactionGasFeeEstimates,
  ) => {
    if (transactionGasFeeEstimates) {
      return mergeGasFeeControllerAndTransactionGasFeeEstimates(
        gasFeeControllerEstimateType,
        gasFeeControllerEstimates,
        transactionGasFeeEstimates,
      );
    }

    return gasFeeControllerEstimates;
  },
);
