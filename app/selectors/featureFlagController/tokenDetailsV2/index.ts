import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

export const selectTokenDetailsV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    Boolean(
      remoteFeatureFlags[FeatureFlagNames.tokenDetailsV2] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.tokenDetailsV2],
    ),
);
