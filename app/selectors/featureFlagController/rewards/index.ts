import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectBasicFunctionalityEnabled } from '../../settings';

const DEFAULT_REWARDS_ENABLED = false;
const DEFAULT_CARD_SPEND_ENABLED = false;
export const FEATURE_FLAG_NAME = 'rewardsEnabled';
export const ANNOUNCEMENT_MODAL_FLAG_NAME = 'rewardsAnnouncementModalEnabled';
export const CARD_SPEND_FLAG_NAME = 'rewardsEnableCardSpend';

export const selectRewardsEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  selectBasicFunctionalityEnabled,
  (remoteFeatureFlags, isBasicFunctionalityEnabled) => {
    // If basic functionality is disabled, rewards should be disabled
    if (!isBasicFunctionalityEnabled) {
      return false;
    }

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

export const selectRewardsCardSpendFeatureFlags = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, CARD_SPEND_FLAG_NAME)) {
      return DEFAULT_CARD_SPEND_ENABLED;
    }
    const cardSpendConfig = remoteFeatureFlags[
      CARD_SPEND_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(cardSpendConfig) ??
      DEFAULT_CARD_SPEND_ENABLED
    );
  },
);
