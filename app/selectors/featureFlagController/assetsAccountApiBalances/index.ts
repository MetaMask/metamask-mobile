import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

export const FEATURE_FLAG_NAME = 'assetsAccountApiBalances';

export const selectAssetsAccountApiBalancesEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? remoteFeatureFlags[FEATURE_FLAG_NAME]
      : [],
);
