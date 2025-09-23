import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { getFeatureFlagValue } from '../env';

// A type predicate's type must be assignable to its parameter's type
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ConfirmationRedesignRemoteFlags = {
  approve: boolean;
  contract_deployment: boolean;
  contract_interaction: boolean;
  signatures: boolean;
  staking_confirmations: boolean;
  transfer: boolean;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SendRedesignFlags = {
  enabled: boolean;
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

  const isApproveEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_APPROVE,
    remoteValues?.approve !== false,
  );

  const isContractDeploymentEnabled = getFeatureFlagValue(
    process.env.FEATURE_FLAG_REDESIGNED_CONTRACT_DEPLOYMENT,
    remoteValues?.contract_deployment !== false,
  );

  return {
    approve: isApproveEnabled,
    contract_deployment: isContractDeploymentEnabled,
    contract_interaction: isContractInteractionEnabled,
    signatures: isSignaturesEnabled,
    staking_confirmations: isStakingConfirmationsEnabled,
    transfer: isTransferEnabled,
  };
};

export const selectSendRedesignFlagsFromRemoteFeatureFlags = (
  remoteFeatureFlags: ReturnType<typeof selectRemoteFeatureFlags>,
): SendRedesignFlags => {
  const remoteValues = remoteFeatureFlags.sendRedesign as SendRedesignFlags;

  const isEnabled = getFeatureFlagValue(
    process.env.MM_SEND_REDESIGN_ENABLED,
    remoteValues?.enabled !== false,
  );

  return {
    enabled: isEnabled,
  };
};

export const selectConfirmationRedesignFlags = createSelector(
  selectRemoteFeatureFlags,
  selectConfirmationRedesignFlagsFromRemoteFeatureFlags,
);

export const selectSendRedesignFlags = createSelector(
  selectRemoteFeatureFlags,
  selectSendRedesignFlagsFromRemoteFeatureFlags,
);
