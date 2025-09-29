import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

const DEFAULT_RWA_ENABLED = false;
export const FEATURE_FLAG_NAME = 'rwaTokensEnabled';

export const selectRWAEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? (remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean)
      : DEFAULT_RWA_ENABLED,
);
