import { createSelector } from 'reselect';
import { StateWithPartialEngine } from './types';
import { isRemoteFeatureFlagOverrideActivated } from '../../core/Engine/controllers/remote-feature-flag-controller';

export interface ConfirmationRedesignRemoteFlags {
  signatures: boolean;
  staking_confirmations: boolean;
}

function getFeatureFlagValue(
  envValue: string | undefined,
  remoteValue: boolean,
): boolean {
  if (envValue === 'true') {
    return true;
  }
  if (envValue === 'false') {
    return false;
  }
  return remoteValue;
}

export const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

export const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) => {
    if (isRemoteFeatureFlagOverrideActivated) {
      return {};
    }
    return remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {};
  },
);

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

    const isSignaturesEnabled = getFeatureFlagValue(
      process.env.FEATURE_FLAG_REDESIGNED_SIGNATURES,
      confirmationRedesignFlags.signatures,
    );

    return {
      ...confirmationRedesignFlags,
      staking_confirmations: isStakingConfirmationsEnabled,
      signatures: isSignaturesEnabled,
    };
  },
);

export const selectProductSafetyDappScanningEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => getFeatureFlagValue(
      process.env.FEATURE_FLAG_PRODUCT_SAFETY_DAPP_SCANNING,
      (remoteFeatureFlags?.productSafetyDappScanning as boolean),
    )
);
