import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

// Re-export selectors from rewardsEnabled.ts
export {
  selectRewardsEnabledFlag,
  selectRewardsEnabledRawFlag,
  selectMusdHoldingEnabledFlag,
  selectMusdHoldingEnabledRawFlag,
  REWARDS_ENABLED_FLAG_NAME,
  MUSD_HOLDING_FLAG_NAME,
} from './rewardsEnabled';

const DEFAULT_REWARDS_ANNOUNCEMENT_MODAL_ENABLED = false;
const DEFAULT_CARD_SPEND_ENABLED = false;
const DEFAULT_MUSD_DEPOSIT_ENABLED = false;
export const ANNOUNCEMENT_MODAL_FLAG_NAME = 'rewardsAnnouncementModalEnabled';
export const CARD_SPEND_FLAG_NAME = 'rewardsEnableCardSpend';
export const MUSD_DEPOSIT_FLAG_NAME = 'rewardsEnableMusdDeposit';

export const selectRewardsAnnouncementModalEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, ANNOUNCEMENT_MODAL_FLAG_NAME)) {
      return DEFAULT_REWARDS_ANNOUNCEMENT_MODAL_ENABLED;
    }
    const remoteFlag = remoteFeatureFlags[
      ANNOUNCEMENT_MODAL_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_REWARDS_ANNOUNCEMENT_MODAL_ENABLED
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

export const selectRewardsMusdDepositEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, MUSD_DEPOSIT_FLAG_NAME)) {
      return DEFAULT_MUSD_DEPOSIT_ENABLED;
    }
    const musdDepositConfig = remoteFeatureFlags[
      MUSD_DEPOSIT_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(musdDepositConfig) ??
      DEFAULT_MUSD_DEPOSIT_ENABLED
    );
  },
);

const DEFAULT_REWARDS_REFERRAL_ENABLED = false;
export const REWARDS_REFERRAL_FLAG_NAME = 'rewardsReferralEnabled';

export const selectRewardsReferralEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    if (!hasProperty(remoteFeatureFlags, REWARDS_REFERRAL_FLAG_NAME)) {
      return DEFAULT_REWARDS_REFERRAL_ENABLED;
    }
    const flag = remoteFeatureFlags[
      REWARDS_REFERRAL_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(flag)?.enabled ??
      DEFAULT_REWARDS_REFERRAL_ENABLED
    );
  },
);
