import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { getFeatureFlagValue } from '../env';

// A type predicate's type must be assignable to its parameter's type
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ConfirmationRedesignRemoteFlags = {
  approve: boolean;
  contract_interaction: boolean;
  signatures: boolean;
  staking_confirmations: boolean;
<<<<<<< HEAD
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
=======
  contract_interaction: boolean;
  transfer: boolean;
};

const isRemoteFeatureFlagValuesValid = (
  obj: Json,
): obj is ConfirmationRedesignRemoteFlags =>
  isObject(obj) &&
  hasProperty(obj, 'signatures') &&
  hasProperty(obj, 'staking_confirmations') &&
  hasProperty(obj, 'contract_interaction');

const confirmationRedesignFlagsDefaultValues: ConfirmationRedesignRemoteFlags =
  {
    signatures: true,
    staking_confirmations: false,
    contract_interaction: false,
    transfer: false,
  };

export const selectConfirmationRedesignFlagsFromRemoteFeatureFlags = (
  remoteFeatureFlags: ReturnType<typeof selectRemoteFeatureFlags>,
) => {
  const remoteValues = remoteFeatureFlags.confirmation_redesign;

    const confirmationRedesignFlags = isRemoteFeatureFlagValuesValid(
      remoteValues,
    )
      ? remoteValues
      : confirmationRedesignFlagsDefaultValues;

  const isSignaturesEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_SIGNATURES,
    confirmationRedesignFlags.signatures,
>>>>>>> stable
  );

  const isStakingConfirmationsEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_STAKING_TRANSACTIONS,
<<<<<<< HEAD
    remoteValues?.staking_confirmations !== false,
=======
    confirmationRedesignFlags.staking_confirmations,
>>>>>>> stable
  );

  const isContractInteractionEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_CONTRACT_INTERACTION,
<<<<<<< HEAD
    remoteValues?.contract_interaction !== false,
  );

  const isTransferEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_TRANSFER,
    remoteValues?.transfer !== false,
  );

  const isApproveEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_APPROVE,
    false,
  );

  return {
    approve: isApproveEnabled,
    contract_interaction: isContractInteractionEnabled,
    signatures: isSignaturesEnabled,
    staking_confirmations: isStakingConfirmationsEnabled,
=======
    // TODO: This will be pick up values from the remote feature flag once the
    // feature is ready to be rolled out
    false,
  );

  // TODO: This will be pick up values from the remote feature flag once the feature is ready
  // Task is created but still in draft
  const isTransferEnabled = process.env.FEATURE_FLAG_REDESIGNED_TRANSFER === 'true';

  return {
    signatures: isSignaturesEnabled,
    staking_confirmations: isStakingConfirmationsEnabled,
    contract_interaction: isContractInteractionEnabled,
>>>>>>> stable
    transfer: isTransferEnabled,
  };
};

export const selectConfirmationRedesignFlags = createSelector(
  selectRemoteFeatureFlags,
  selectConfirmationRedesignFlagsFromRemoteFeatureFlags,
);
