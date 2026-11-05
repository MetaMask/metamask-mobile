import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../../../app/components/UI/Rewards/components/Money/ClaimableRewardsCard.testIds';
import { REFEREE_HERO_CARD_TEST_IDS } from '../../../app/components/UI/Rewards/components/Money/RefereeHeroCard.testIds';
import { WAYS_TO_EARN_TAB_TEST_IDS } from '../../../app/components/UI/Rewards/components/Money/Tabs/WaysToEarnTab.testIds';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from '../../../app/components/UI/Rewards/Views/RewardsMoneyDashboard.testIds';
import {
  Assertions,
  Gestures,
  Matchers,
  type AppiumElement,
} from '../../framework';

/** Same budget deeplink-navigation uses for a screen opened from a URL. */
const DEEPLINK_SCREEN_TIMEOUT = 20_000;

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

  async expectRefereeHeroVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.refereeHeroCard, {
      timeout: DEEPLINK_SCREEN_TIMEOUT,
      description:
        'Rewards Money dashboard shows the referee hero after the money campaign deeplink',
    });
  }

  async expectInvitedBenefitTitle(title: string): Promise<void> {
    await Assertions.expectTextDisplayed(title, {
      timeout: DEEPLINK_SCREEN_TIMEOUT,
      description: 'Referee hero shows the mocked invited benefit title',
    });
  }

  async tapEarningsTab(): Promise<void> {
    await Gestures.waitAndTap(this.earningsTab, {
      timeout: DEEPLINK_SCREEN_TIMEOUT,
      elemDescription: 'Earnings tab',
    });
  }

  async expectClaimedEarnings(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.claimedButton, {
      timeout: DEEPLINK_SCREEN_TIMEOUT,
      description: 'Claimed earnings stay on the Earnings tab',
    });
  }
}

export default new RewardsMoneyView();
