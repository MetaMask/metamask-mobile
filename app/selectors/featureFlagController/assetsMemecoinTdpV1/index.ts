import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

interface AssetsMemecoinTdpV1FeatureFlag {
  enabled?: boolean;
}

/**
 * Whether the Memecoin Token Details Page (TDP) V1 experience is enabled.
 *
 * Remote flag key: `assetsMemecoinTdpV1`. Resolved shape is `{ enabled: boolean }`
 * (version / threshold rollout is handled by RemoteFeatureFlagController).
 */
export const selectAssetsMemecoinTdpV1Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const featureFlag = (remoteFeatureFlags[
      FeatureFlagNames.assetsMemecoinTdpV1
    ] ?? DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.assetsMemecoinTdpV1]) as
      | AssetsMemecoinTdpV1FeatureFlag
      | undefined;

    return Boolean(featureFlag?.enabled);
  },
);
