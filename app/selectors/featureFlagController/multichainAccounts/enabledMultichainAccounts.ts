import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  isMultichainAccountsRemoteFeatureEnabled,
  MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_1,
  MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2,
} from '../../../multichain-accounts/remote-feature-flag';

/**
 * Creates a selector to determine if multichain accounts are enabled based on the feature version.
 * @param featureVersions - The versions of the feature to check against.
 * @returns Boolean indicating if the multichain accounts feature is enabled for the specified versions.
 */
const createMultichainAccountsStateSelector = (featureVersions: string[]) =>
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags): boolean =>
    isMultichainAccountsRemoteFeatureEnabled(
      remoteFeatureFlags,
      featureVersions,
    ),
  );

/**
 * Selector to check if multichain accounts state 1 is enabled.
 * Returns true if the feature is enabled for state 1 or state 2.
 */
export const selectMultichainAccountsState1Enabled =
  createMultichainAccountsStateSelector([
    MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_1,
    MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2,
  ]);

/**
 * Selector to check if multichain accounts state 2 is enabled.
 * @returns Boolean indicating if multichain accounts state 2 is enabled.
 */
export const selectMultichainAccountsState2Enabled =
  createMultichainAccountsStateSelector([
    MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2,
  ]);
