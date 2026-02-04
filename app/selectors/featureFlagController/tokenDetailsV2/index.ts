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

/**
 * Temporary feature flag for the Buy/Sell sticky bar buttons below the chart.
 * This is used to control the new button layout in TokenDetails.
 * TODO: Remove this once the first iteration is stable.
 */
export const isTokenDetailsRevampedEnabled = () => false;
