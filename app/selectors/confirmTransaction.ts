import { selectTransactions } from './transactionController';
import { RootState } from '../reducers';
import {
  selectGasFeeControllerEstimateType,
  selectGasFeeControllerEstimates,
} from './gasFeeController';
import { mergeGasFeeEstimates } from '@metamask/transaction-controller';
import { createSelector } from 'reselect';
import { createDeepEqualSelector } from './util';

const selectCurrentTransactionId = (state: RootState) => state.transaction?.id;

export const selectCurrentTransactionMetadata = createSelector(
  selectTransactions,
  selectCurrentTransactionId,
  (transactions, currentTransactionId) =>
    transactions.find((tx) => tx.id === currentTransactionId),
);

const selectCurrentTransactionGasFeeEstimatesStrict = createSelector(
  selectCurrentTransactionMetadata,
  (transactionMetadata) => transactionMetadata?.gasFeeEstimates,
);

const selectCurrentTransactionGasFeeEstimatesLoaded = createSelector(
  selectCurrentTransactionMetadata,
  (transactionMetadata) => transactionMetadata?.gasFeeEstimatesLoaded,
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

export const selectTransactionGasFeeEstimates = createSelector(
  selectCurrentTransactionGasFeeEstimatesLoaded,
  selectGasFeeEstimates,
  (transactionGasFeeEstimatesLoaded, gasFeeEstimates) =>
    transactionGasFeeEstimatesLoaded ? gasFeeEstimates : undefined,
);
