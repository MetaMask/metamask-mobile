import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

export const selectAssetsDefiPositionsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.assetsDefiPositionsEnabled] ??
        DEFAULT_FEATURE_FLAG_VALUES[
          FeatureFlagNames.assetsDefiPositionsEnabled
        ],
    ),
);
