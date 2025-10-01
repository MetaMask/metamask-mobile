import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { getFeatureFlagValue } from '../env';
import { Json } from '@metamask/utils';

export const ATTEMPTS_MAX_DEFAULT = 2;
export const BUFFER_INITIAL_DEFAULT = 0.025;
export const BUFFER_STEP_DEFAULT = 0.025;
export const BUFFER_SUBSEQUENT_DEFAULT = 0.05;
export const SLIPPAGE_DEFAULT = 0.005;

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

export interface MetaMaskPayFlags {
  attemptsMax: number;
  bufferInitial: number;
  bufferStep: number;
  bufferSubsequent: number;
  slippage: number;
}

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

export const selectMetaMaskPayFlags = createSelector(
  selectRemoteFeatureFlags,
  (featureFlags) => {
    const metaMaskPayFlags = featureFlags?.confirmation_pay as
      | Record<string, Json>
      | undefined;

    const attemptsMax = metaMaskPayFlags?.attemptsMax ?? ATTEMPTS_MAX_DEFAULT;
    const bufferInitial =
      metaMaskPayFlags?.bufferInitial ?? BUFFER_INITIAL_DEFAULT;
    const bufferStep = metaMaskPayFlags?.bufferStep ?? BUFFER_STEP_DEFAULT;
    const bufferSubsequent =
      metaMaskPayFlags?.bufferSubsequent ?? BUFFER_SUBSEQUENT_DEFAULT;
    const slippage = metaMaskPayFlags?.slippage ?? SLIPPAGE_DEFAULT;

    return {
      attemptsMax,
      bufferInitial,
      bufferStep,
      bufferSubsequent,
      slippage,
    } as MetaMaskPayFlags;
  },
);

/**
 * Selector to get the allow list for non-zero unused approvals from remote feature flags.
 *
 * @param state - The MetaMask state object
 * @returns {string[]} Array of URL strings for the allow list
 */
export const selectNonZeroUnusedApprovalsAllowList = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags: ReturnType<typeof selectRemoteFeatureFlags>) =>
    remoteFeatureFlags?.nonZeroUnusedApprovals ?? [],
);
