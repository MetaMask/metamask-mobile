import compareVersions from 'compare-versions';
import { createSelector } from 'reselect';
import packageJson from '../../../../package.json';
import { selectRemoteFeatureFlags } from '..';

/**
 * Multichain accounts feature flag
 */
export interface MultichainAccountsFeatureFlag {
  enabled: boolean;
  featureVersion: string | null;
  minimumVersion: string | null;
}

const APP_VERSION = packageJson.version;
const FEATURE_VERSION_1 = '1';
const FEATURE_VERSION_2 = '2';

/**
 * Asserts that the given value is a valid MultichainAccountsFeatureFlag.
 * @param value - The value to check.
 * @returns True if the value is a valid MultichainAccountsFeatureFlag, false otherwise.
 */
export const assertMultichainAccountsFeatureFlagType = (value: unknown): value is MultichainAccountsFeatureFlag => (
  typeof value === 'object' &&
  value !== null &&
  'enabled' in value &&
  typeof value.enabled === 'boolean' &&
  'featureVersion' in value &&
  (typeof value.featureVersion === 'string' || value.featureVersion === null) &&
  'minimumVersion' in value &&
  (typeof value.minimumVersion === 'string' || value.minimumVersion === null)
);

/**
 * Checks if the multichain accounts feature is enabled based on the provided feature flag and version.
 *
 * @param enabledMultichainAccounts - The feature flag for multichain accounts.
 * @param featureVersionToCheck - The version of the feature to check against.
 * @returns True if the multichain accounts feature is enabled for the specified version, false otherwise.
 */
export const isMultichainAccountsFeatureEnabled = (
  enableMultichainAccounts: MultichainAccountsFeatureFlag | undefined,
  featureVersionToCheck: string
): boolean => {
  if (!enableMultichainAccounts) {
    return false;
  }

  const { enabled, featureVersion, minimumVersion } = enableMultichainAccounts;

  if (!enabled || !minimumVersion || !featureVersion) {
    return false;
  }

  return (
    featureVersion === featureVersionToCheck &&
    compareVersions.compare(minimumVersion, APP_VERSION, '<=')
  );
};

/**
 * Creates a selector to determine if multichain accounts are enabled based on the feature version.
 * @param featureVersions - The versions of the feature to check against.
 * @returns Boolean indicating if the multichain accounts feature is enabled for the specified versions.
 */
const createMultichainAccountsStateSelector = (featureVersions: string[]) =>
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags): boolean => {
    const enableMultichainAccounts = remoteFeatureFlags.enableMultichainAccounts;
    if (!assertMultichainAccountsFeatureFlagType(enableMultichainAccounts)) {
      return false;
    }

    // Check if the feature is enabled for any of the specified versions
    return featureVersions.some((featureVersion) =>
      isMultichainAccountsFeatureEnabled(enableMultichainAccounts, featureVersion)
    );
  });

/**
 * Selector to check if multichain accounts state 1 is enabled.
 * Returns true if the feature is enabled for state 1 or state 2.
 */
export const selectMultichainAccountsState1Enabled = createMultichainAccountsStateSelector([FEATURE_VERSION_1, FEATURE_VERSION_2]);

/**
 * Selector to check if multichain accounts state 2 is enabled.
 * @returns Boolean indicating if multichain accounts state 2 is enabled.
 */
export const selectMultichainAccountsState2Enabled = createMultichainAccountsStateSelector([FEATURE_VERSION_2]);
