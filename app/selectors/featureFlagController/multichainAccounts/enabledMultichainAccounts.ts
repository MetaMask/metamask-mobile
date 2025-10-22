import { FeatureFlags } from '@metamask/remote-feature-flag-controller';
import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  isMultichainAccountsRemoteFeatureEnabled,
  STATE_1_FLAG,
  STATE_2_FLAG,
  MULTICHAIN_ACCOUNTS_FEATURE_VERSION_1,
  MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
} from '../../../multichain-accounts/remote-feature-flag';

/**
 * Creates a selector to determine if multichain accounts are enabled based on the feature version.
 * @param featureVersions - The versions of the feature to check against.
 * @returns Boolean indicating if the multichain accounts feature is enabled for the specified versions.
 */
const createMultichainAccountsStateSelector = (
  featureVersionsToCheck: {
    version: string;
    featureKey: keyof FeatureFlags;
  }[],
) =>
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags): boolean =>
    isMultichainAccountsRemoteFeatureEnabled(
      remoteFeatureFlags,
      featureVersionsToCheck,
    ),
  );

/**
 * Selector to check if multichain accounts state 1 is enabled.
 * Returns true if the feature is enabled for state 1 or state 2.
 */
export const selectMultichainAccountsState1Enabled =
  createMultichainAccountsStateSelector([
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
 * Selector to check if multichain accounts state 2 is enabled.
 * @returns Boolean indicating if multichain accounts state 2 is enabled.
 */
export const selectMultichainAccountsState2Enabled =
  createMultichainAccountsStateSelector([
    {
      version: MULTICHAIN_ACCOUNTS_FEATURE_VERSION_2,
      featureKey: STATE_2_FLAG,
    },
  ]);
