import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';

const DEFAULT_ASSETS_DEFI_POSITIONS_ENABLED = false;
export const FEATURE_FLAG_NAME = 'assetsDefiPositionsEnabled';

export const selectAssetsDefiPositionsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)
      ? (remoteFeatureFlags[FEATURE_FLAG_NAME] as boolean)
      : DEFAULT_ASSETS_DEFI_POSITIONS_ENABLED,
);
