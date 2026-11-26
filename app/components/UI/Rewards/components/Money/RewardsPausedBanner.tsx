import React from 'react';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import RewardsAmountBanner from './RewardsAmountBanner';
import { REWARDS_PAUSED_BANNER_TEST_IDS } from './RewardsPausedBanner.testIds';

/**
 * Neutral banner above claims history. The amount is `blocked` on families
 * whose reason is `UNDER_REVIEW`. The whole banner opens the rewards paused
 * sheet.
 */
const RewardsPausedBanner: React.FC<{
  baseUnits: string;
  localizedText: ReferralLocalizedText;
}> = ({ baseUnits, localizedText }) => (
  <RewardsAmountBanner
    baseUnits={baseUnits}
    bannerText={localizedText.rewardsPausedBanner}
    placeholder="{amount}"
    learnMoreText={localizedText.rewardsPausedLearnMore}
    sheetTitle={localizedText.rewardsPausedTitle}
    sheetDescription={localizedText.rewardsPausedDescription}
    testIds={REWARDS_PAUSED_BANNER_TEST_IDS}
  />
);

export default RewardsPausedBanner;
