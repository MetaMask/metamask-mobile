import { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import Engine from '../core/Engine';

/**
 * Multichain accounts feature flag
 */
export interface MultichainAccountsFeatureFlag {
  enabled: boolean;
  featureVersion: string | null;
  minimumVersion: string | null;
}

const enableMultichainAccountsState2Local =
  process.env.MM_ENABLE_MULTICHAIN_ACCOUNTS_STATE_2;

export const MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1 = '1';
export const MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2 = '2';

export const STATE_1_FLAG = 'enableMultichainAccounts';
export const STATE_2_FLAG = 'enableMultichainAccountsState2';

/**
 * Checks if the multichain accounts feature is enabled based on remote feature flags.
 *
 * @param remoteFeatureFlags - The remote feature flags to check against.
 * @param featureVersionToCheck - The version of the feature to check against.
 * @returns True if the multichain accounts feature is enabled for any specified versions, false otherwise.
 */
export const isMultichainAccountsRemoteFeatureEnabled = (
  _remoteFeatureFlags: FeatureFlags,
  _featureVersionsToCheck: {
    version: string;
    featureKey: keyof FeatureFlags;
  }[],
  _override?: string,
): boolean => true;

/**
 * Get remote feature flags from its controller's state.
 */
function getRemoteFeatureFlags(): FeatureFlags {
  return Engine.context.RemoteFeatureFlagController.state.remoteFeatureFlags;
}

/**
 * Checks if multichain accounts state 1 is enabled.
 * Returns true if the feature is enabled for state 1 or state 2.
 */
export const isMultichainAccountsState1Enabled = () =>
  isMultichainAccountsRemoteFeatureEnabled(getRemoteFeatureFlags(), [
    {
      version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
      featureKey: STATE_1_FLAG,
    },
    {
      version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
      featureKey: STATE_2_FLAG,
    },
  ]);

/**
 * Checks if multichain accounts state 2 is enabled.
 * @returns Boolean indicating if multichain accounts state 2 is enabled.
 */
export const isMultichainAccountsState2Enabled = () =>
  isMultichainAccountsRemoteFeatureEnabled(
    getRemoteFeatureFlags(),
    [
      {
        version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
        featureKey: STATE_2_FLAG,
      },
    ],
    enableMultichainAccountsState2Local,
  );
