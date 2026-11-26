import React from 'react';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import RewardsAmountBanner from './RewardsAmountBanner';
import { REWARDS_HELD_BANNER_TEST_IDS } from './RewardsHeldBanner.testIds';

/**
 * Neutral banner for income held until a tax determination clears the payee.
 * The amount is `held` on families whose reason is
 * `TAX_DETERMINATION_REQUIRED`. The whole banner opens the rewards held
 * sheet, which explains the hold. It does not start the tax flow.
 */
const RewardsHeldBanner: React.FC<{
  baseUnits: string;
  localizedText: ReferralLocalizedText;
}> = ({ baseUnits, localizedText }) => (
  <RewardsAmountBanner
    baseUnits={baseUnits}
    bannerText={localizedText.rewardsHeldBanner}
    placeholder="{heldAmount}"
    learnMoreText={localizedText.rewardsHeldLearnMore}
    sheetTitle={localizedText.rewardsHeldTitle}
    sheetDescription={localizedText.rewardsHeldDescription}
    testIds={REWARDS_HELD_BANNER_TEST_IDS}
  />
);

export default RewardsHeldBanner;
