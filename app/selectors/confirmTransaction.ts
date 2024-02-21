import { selectTransactions } from './transactionController';
import { RootState } from '../reducers';
import {
  selectGasFeeControllerEstimateType,
  selectGasFeeControllerEstimates,
} from './gasFeeController';
import { mergeGasFeeEstimates } from '@metamask/transaction-controller';
import { createSelector } from 'reselect';
import { createDeepEqualSelector } from './util';

export const selectCurrentTransaction = (state: RootState) => state.transaction;

export const selectCurrentTransactionMetadata = createSelector(
  selectTransactions,
  selectCurrentTransaction,
  (transactions, currentTransaction) =>
    transactions.find((tx) => tx.id === currentTransaction?.id),
);

const selectCurrentTransactionGasFeeEstimatesStrict = createSelector(
  selectCurrentTransactionMetadata,
  (transactionMetadata) => transactionMetadata?.gasFeeEstimates,
);

export const selectCurrentTransactionGasFeeEstimates = createDeepEqualSelector(
  selectCurrentTransactionGasFeeEstimatesStrict,
  (gasFeeEstimates) => gasFeeEstimates,
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
      return mergeGasFeeEstimates({
        gasFeeControllerEstimateType: gasFeeControllerEstimateType as any,
        gasFeeControllerEstimates: gasFeeControllerEstimates as any,
        transactionGasFeeEstimates,
      });
    }

    return gasFeeControllerEstimates;
  },
);
