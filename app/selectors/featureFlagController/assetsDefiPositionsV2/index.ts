import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

/**
 * Whether DeFi Positions Controller V2 is enabled.
 * When true, V2 is used and the legacy V1 controller is disabled.
 * When false, V1 is used and V2 is disabled.
 */
export const selectAssetsDefiPositionsV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => true,
  // Boolean(
  //   remoteFeatureFlags[FeatureFlagNames.assetsDefiPositionsV2Enabled] ??
  //     DEFAULT_FEATURE_FLAG_VALUES[
  //       FeatureFlagNames.assetsDefiPositionsV2Enabled
  //     ],
  // ),
);
