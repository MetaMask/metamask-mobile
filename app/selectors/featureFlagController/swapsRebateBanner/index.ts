import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

/**
 * Whether the Swaps and Quick Buy fee rebate banner is enabled.
 *
 * Remote flag key: `swapsRebateBannerEnabled`. Defaults to false when the
 * flag is missing or invalid.
 */
export const selectSwapsRebateBannerEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag =
      remoteFeatureFlags?.swapsRebateBannerEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
