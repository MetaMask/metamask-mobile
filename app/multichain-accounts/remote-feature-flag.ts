import compareVersions from 'compare-versions';
import packageJson from '../../package.json';
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

const APP_VERSION = packageJson.version;
const disabledMultichainAccountsState2Local =
  process.env.MM_DISABLE_MULTICHAIN_ACCOUNTS_STATE_2 === 'true';

export const MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_1 = '1';
export const MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2 = '2';

/**
 * Asserts that the given value is a valid MultichainAccountsFeatureFlag.
 * @param value - The value to check.
 * @returns True if the value is a valid MultichainAccountsFeatureFlag, false otherwise.
 */
export const assertMultichainAccountsFeatureFlagType = (
  value: unknown,
): value is MultichainAccountsFeatureFlag =>
  typeof value === 'object' &&
  value !== null &&
  'enabled' in value &&
  typeof value.enabled === 'boolean' &&
  'featureVersion' in value &&
  (typeof value.featureVersion === 'string' || value.featureVersion === null) &&
  'minimumVersion' in value &&
  (typeof value.minimumVersion === 'string' || value.minimumVersion === null);

/**
 * Checks if the multichain accounts feature is enabled based on remote feature flags.
 *
 * @param remoteFeatureFlags - The remote feature flags to check against.
 * @param featureVersionsToCheck - The versions of the feature to check against.
 * @returns True if the multichain accounts feature is enabled for any specified versions, false otherwise.
 */
export const isMultichainAccountsRemoteFeatureEnabled = (
  remoteFeatureFlags: FeatureFlags,
  featureVersionsToCheck: string[],
) => {
  // Overrides the multichain accounts state 2 enabled flag based on the feature versions.
  // This is used to enable the feature locally for development/testing purposes.
  if (
    disabledMultichainAccountsState2Local &&
    featureVersionsToCheck.includes(MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2)
  ) {
    return false;
  }

  const enableMultichainAccounts = remoteFeatureFlags.enableMultichainAccounts;
  if (
    !enableMultichainAccounts ||
    !assertMultichainAccountsFeatureFlagType(enableMultichainAccounts)
  ) {
    return false;
  }

  const { enabled, featureVersion, minimumVersion } = enableMultichainAccounts;

  if (!enabled || !minimumVersion || !featureVersion) {
    return false;
  }

  // Check if the feature is enabled for any of the specified versions
  return featureVersionsToCheck.some(
    (featureVersionToCheck) =>
      featureVersion === featureVersionToCheck &&
      compareVersions.compare(minimumVersion, APP_VERSION, '<='),
  );
};

/**
 * Get remote feature flags from its controller's state.
 */
function getRemoteFeatureFlags(): FeatureFlags {
  return Engine.context.RemoteFeatureFlagController.state.remoteFeatureFlags;
}

/**
 * Check if multichain accounts state 1 is enabled.
 * Returns true if the feature is enabled for state 1 or state 2.
 */
export const isMultichainAccountsState1Enabled = () =>
  isMultichainAccountsRemoteFeatureEnabled(getRemoteFeatureFlags(), [
    MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_1,
    MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2,
  ]);

/**
 * Check if multichain accounts state 2 is enabled.
 * @returns Boolean indicating if multichain accounts state 2 is enabled.
 */
export const isMultichainAccountsState2Enabled = () =>
  isMultichainAccountsRemoteFeatureEnabled(getRemoteFeatureFlags(), [
    MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2,
  ]);
