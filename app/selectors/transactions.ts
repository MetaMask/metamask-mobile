import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';

export function selectGasFeeControllerEstimates(state: RootState) {
  return state.engine.backgroundState.GasFeeController.gasFeeEstimates;
}

export function selectGasFeeControllerEstimateType(state: RootState) {
  return state.engine.backgroundState.GasFeeController.gasEstimateType;
}

export function selectTransactionMetadata(state: RootState) {
  return state.engine.backgroundState.TransactionController.transactions.find(
    (tx) => tx.id === state.transaction?.id,
  );
}

export const selectTransactionGasFeeEstimates = createSelector(
  selectGasFeeControllerEstimates,
  selectGasFeeControllerEstimateType,
  selectTransactionMetadata,
  (
    gasFeeControllerEstimates: any,
    gasFeeControllerEstimateType,
    transactionMetadata,
  ) => {
    const suggestedGasFees = transactionMetadata?.suggestedGasFees;

    if (!suggestedGasFees) {
      return undefined;
    }

    if (gasFeeControllerEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
      return {
        ...gasFeeControllerEstimates,
        ...(['low', 'medium', 'high'] as const).reduce(
          (result, level) => ({
            ...result,
            [level]: {
              ...gasFeeControllerEstimates[level],
              ...suggestedGasFees.eip1559[level],
            },
          }),
          {},
        ),
      };
    }

    if (gasFeeControllerEstimateType === GAS_ESTIMATE_TYPES.LEGACY) {
      return suggestedGasFees.legacy;
    }

    return gasFeeControllerEstimates;
  },
);

export const selectGasFeeEstimates = createSelector(
  selectGasFeeControllerEstimates,
  selectTransactionGasFeeEstimates,
  (gasFeeControllerEstimates, transactionGasFeeEstimates) =>
    transactionGasFeeEstimates ?? gasFeeControllerEstimates,
);
