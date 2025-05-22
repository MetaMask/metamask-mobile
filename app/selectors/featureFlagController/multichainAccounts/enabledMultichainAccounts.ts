import compareVersions from 'compare-versions';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
// return compareVersions.compare(currentVersion, minRequiredVersion, '>=');


/**
 * Multichain accounts feature flag
 */
export interface MultichainAccountsFeatureFlag {
  enabled: boolean;
  featureVersion: string | null;
  minimumVersion: string | null;
}

// TODO: Update the value to the decided version multichain accounts will be released
const MINIMUM_SUPPORTED_VERSION = null;
const FEATURE_VERSION_1 = '1';
const FEATURE_VERSION_2 = '2';

const isMultichainAccountsFeatureEnabled = (
  enabledMultichainAccounts: MultichainAccountsFeatureFlag | undefined,
  featureVersionToCheck: string
): boolean => {
  if (!enabledMultichainAccounts) {
    return false;
  }

  const { enabled, featureVersion, minimumVersion } = enabledMultichainAccounts;

  return (
    Boolean(enabled) &&
    featureVersion === featureVersionToCheck &&
    Boolean(minimumVersion) &&
    compareVersions.compare(minimumVersion, MINIMUM_SUPPORTED_VERSION, '>=')
  );
};

export const selectMultichainAccountsState1Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const enabledMultichainAccounts = remoteFeatureFlags?.enabledMultichainAccounts as MultichainAccountsFeatureFlag | undefined;
    return isMultichainAccountsFeatureEnabled(enabledMultichainAccounts, FEATURE_VERSION_1);
  }
);

export const selectMultichainAccountsState2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const enabledMultichainAccounts = remoteFeatureFlags?.enabledMultichainAccounts as MultichainAccountsFeatureFlag | undefined;
    return isMultichainAccountsFeatureEnabled(enabledMultichainAccounts, FEATURE_VERSION_2);
  }
);
