import { mergeGasFeeEstimates } from '@metamask/transaction-controller';
import { createSelector } from 'reselect';
import { RootState } from '../reducers';
import { getFeatureFlagValue, selectRemoteFeatureFlags } from './featureFlagController';
import { selectGasFeeControllerEstimates } from './gasFeeController';
import { selectTransactions } from './transactionController';
import { createDeepEqualSelector } from './util';

const selectCurrentTransactionId = (state: RootState) => state.transaction?.id;

export const selectCurrentTransactionSecurityAlertResponse = (
  state: RootState,
) => {
  const { id, securityAlertResponses } = state.transaction;
  return securityAlertResponses?.[id];
};

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

export const selectCurrentTransactionGasFeeEstimates = createDeepEqualSelector(
  selectCurrentTransactionGasFeeEstimatesStrict,
  (gasFeeEstimates) => gasFeeEstimates,
);

export const selectGasFeeEstimates = createSelector(
  selectGasFeeControllerEstimates,
  selectCurrentTransactionGasFeeEstimates,
  (gasFeeControllerEstimates, transactionGasFeeEstimates) => {
    if (transactionGasFeeEstimates) {
      return mergeGasFeeEstimates({
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gasFeeControllerEstimates: gasFeeControllerEstimates as any,
        transactionGasFeeEstimates,
      });
    }

    return gasFeeControllerEstimates;
  },
);

export interface ConfirmationRedesignRemoteFlags {
  signatures: boolean;
  staking_confirmations: boolean;
  contract_interaction: boolean;
}

export const selectConfirmationRedesignFlags = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const confirmationRedesignFlags =
      (remoteFeatureFlags?.confirmation_redesign as unknown as ConfirmationRedesignRemoteFlags) ??
      {};

    const isStakingConfirmationsEnabled = getFeatureFlagValue(
      process.env.FEATURE_FLAG_REDESIGNED_STAKING_TRANSACTIONS,
      confirmationRedesignFlags.staking_confirmations,
    );

    const isContractInteractionEnabled = getFeatureFlagValue(
      process.env.FEATURE_FLAG_REDESIGNED_CONTRACT_INTERACTION,
      confirmationRedesignFlags.contract_interaction,
    )

    const isSignaturesEnabled = getFeatureFlagValue(
      process.env.FEATURE_FLAG_REDESIGNED_SIGNATURES,
      confirmationRedesignFlags.signatures,
    );

    return {
      ...confirmationRedesignFlags,
      staking_confirmations: isStakingConfirmationsEnabled,
      signatures: isSignaturesEnabled,
      contract_interaction: isContractInteractionEnabled,
    };
  },
);
