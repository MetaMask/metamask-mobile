import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

export const selectAssetsDefiPositionsV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.assetsDefiPositionsV2Enabled] ??
        DEFAULT_FEATURE_FLAG_VALUES[
          FeatureFlagNames.assetsDefiPositionsV2Enabled
        ],
    ),
);
