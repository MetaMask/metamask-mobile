import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../../../app/components/UI/Rewards/components/Money/ClaimableRewardsCard.testIds';
import { REFEREE_HERO_CARD_TEST_IDS } from '../../../app/components/UI/Rewards/components/Money/RefereeHeroCard.testIds';
import { WAYS_TO_EARN_TAB_TEST_IDS } from '../../../app/components/UI/Rewards/components/Money/Tabs/WaysToEarnTab.testIds';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from '../../../app/components/UI/Rewards/Views/RewardsMoneyDashboard.testIds';
import Matchers from '../../framework/Matchers';
import type { AppiumElement } from '../../framework';

/**
 * Rewards Money dashboard. Readiness is the referee hero, which only mounts
 * after referral me has resolved to the referee persona.
 */
class RewardsMoneyView {
  get refereeHeroCard(): Promise<AppiumElement> {
    return Matchers.getElementByID(REFEREE_HERO_CARD_TEST_IDS.CONTAINER);
  }

  get waysToEarnTab(): Promise<AppiumElement> {
    return Matchers.getElementByID(WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER);
  }

  get earningsTab(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      REWARDS_MONEY_DASHBOARD_TEST_IDS.EARNINGS_TAB,
    );
  }

  get claimedButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON,
    );
  }
}

export default new RewardsMoneyView();
