import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_REWARDS_ENABLED = false;
export const FEATURE_FLAG_NAME = 'rewardsEnabled';
export const ANNOUNCEMENT_MODAL_FLAG_NAME = 'rewardsAnnouncementModalEnabled';

export const selectRewardsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, FEATURE_FLAG_NAME)) {
      return DEFAULT_REWARDS_ENABLED;
    }
    const remoteFlag = remoteFeatureFlags[
      FEATURE_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ?? DEFAULT_REWARDS_ENABLED
    );
  },
);

export const selectRewardsAnnouncementModalEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, ANNOUNCEMENT_MODAL_FLAG_NAME)) {
      return DEFAULT_REWARDS_ENABLED;
    }
    const remoteFlag = remoteFeatureFlags[
      ANNOUNCEMENT_MODAL_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ?? DEFAULT_REWARDS_ENABLED
    );
  },
);
