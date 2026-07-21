import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';

interface DefiControllerV2FeatureFlag {
  enabled?: boolean;
}

/**
 * Whether DeFi Positions Controller V2 is enabled.
 * When true, V2 is used and the legacy V1 controller is disabled.
 * When false, V1 is used and V2 is disabled.
 *
 * Remote flag key: `defiControllerV2`. Resolved shape is `{ enabled: boolean }`
 * (version / threshold rollout is handled by RemoteFeatureFlagController).
 */
export const selectDefiControllerV2Enabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const featureFlag = (remoteFeatureFlags[
      FeatureFlagNames.defiControllerV2
    ] ?? DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.defiControllerV2]) as
      | DefiControllerV2FeatureFlag
      | undefined;

    return Boolean(featureFlag?.enabled) || true;
  },
);
