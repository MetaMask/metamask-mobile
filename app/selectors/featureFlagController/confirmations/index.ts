import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { getFeatureFlagValue } from '../env';

// A type predicate's type must be assignable to its parameter's type
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ConfirmationRedesignRemoteFlags = {
  signatures: boolean;
  staking_confirmations: boolean;
  contract_interaction: boolean;
  transfer: boolean;
};

/**
 * Determines the enabled state of confirmation redesign features by combining
 * local environment variables with remote feature flags.
 *
 * Remote feature flags act as a "kill switch" - when no local environment variable
 * is set, the remote flag value takes precedence. If a remote flag is explicitly
 * set to `false`, it can disable the feature remotely.
 *
 * ## Adding New Confirmation Flag
 *
 * **During Development:**
 * Use a local environment variable with a default fallback:
 * ```
 * const isNewConfirmationTypeEnabled = getFeatureFlagValue(
 *   process.env.FEATURE_FLAG_REDESIGNED_NEW_CONFIRMATION_TYPE,
 *   false,
 * );
 * ```
 *
 * **After Development (On Release):**
 * Replace the fallback with the remote kill switch:
 * ```
 * const isNewConfirmationTypeEnabled = getFeatureFlagValue(
 *   process.env.FEATURE_FLAG_REDESIGNED_NEW_CONFIRMATION_TYPE,
 *   remoteValues?.new_confirmation_type !== false,
 * );
 * ```
 * 
 * **After Validation In Production For Certain Time(When old code is decided to be removed):**
 * Remove the both local environment variable and remote flag as kill switch is non-functional.
 * ```
 * const isNewConfirmationTypeEnabled = true;
 * ```
 *
 * @param remoteFeatureFlags - The remote feature flags object containing confirmation_redesign settings
 * @returns An object with boolean flags for each confirmation redesign feature
 */
export const selectConfirmationRedesignFlagsFromRemoteFeatureFlags = (
  remoteFeatureFlags: ReturnType<typeof selectRemoteFeatureFlags>,
): ConfirmationRedesignRemoteFlags => {
  const remoteValues =
    remoteFeatureFlags.confirmation_redesign as ConfirmationRedesignRemoteFlags;

  const isSignaturesEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_SIGNATURES,
    remoteValues?.signatures !== false,
  );

  const isStakingConfirmationsEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_STAKING_TRANSACTIONS,
    remoteValues?.staking_confirmations !== false,
  );

  const isContractInteractionEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_CONTRACT_INTERACTION,
    remoteValues?.contract_interaction !== false,
  );

  const isTransferEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_TRANSFER,
    remoteValues?.transfer !== false,
  );

  return {
    signatures: isSignaturesEnabled,
    staking_confirmations: isStakingConfirmationsEnabled,
    contract_interaction: isContractInteractionEnabled,
    transfer: isTransferEnabled,
  };
};

export const selectConfirmationRedesignFlags = createSelector(
  selectRemoteFeatureFlags,
  selectConfirmationRedesignFlagsFromRemoteFeatureFlags,
);
