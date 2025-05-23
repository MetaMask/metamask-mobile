/* eslint-disable @typescript-eslint/no-unused-vars */
// We can ignore the unused vars warning while the flag is not active

import compareVersions from 'compare-versions';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

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

  if (!enabled || !minimumVersion || !featureVersion) {
    return false;
  }

  return (
    featureVersion === featureVersionToCheck &&
    // @ts-expect-error - this error can be ignored while the minimum version is not defined
    compareVersions.compare(minimumVersion, MINIMUM_SUPPORTED_VERSION, '>=')
  );
};

const createMultichainAccountsStateSelector = (featureVersion: string) =>
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags): boolean => false);

// TODO: Update selector logic to use remote feature flag.
//
// Code:
// const createMultichainAccountsStateSelector = (featureVersion: string) =>
//   createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags): boolean => {
//      const enabledMultichainAccounts = remoteFeatureFlags?.enabledMultichainAccounts;
//      return isMultichainAccountsFeatureEnabled(enabledMultichainAccounts, featureVersion);
//   });


export const selectMultichainAccountsState1Enabled = createMultichainAccountsStateSelector(FEATURE_VERSION_1);
export const selectMultichainAccountsState2Enabled = createMultichainAccountsStateSelector(FEATURE_VERSION_2);
