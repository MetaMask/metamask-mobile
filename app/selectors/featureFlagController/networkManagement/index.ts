import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const NETWORK_MANAGEMENT_FLAG_KEY = 'mobileUxNetworkManagement';

/**
 * Selector for the network management feature flag.
 * Returns true if the feature is enabled AND the current version meets the minimum version requirement.
 */
export const selectNetworkManagementEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags[
      NETWORK_MANAGEMENT_FLAG_KEY
    ] as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
