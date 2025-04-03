import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../';
import { ConfirmationRedesignRemoteFlags } from './types';

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
