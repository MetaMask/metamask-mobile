import { CLAIMABLE_REWARDS_CARD_TEST_IDS } from '../../../app/components/UI/Rewards/components/Money/ClaimableRewardsCard.testIds';
import { WAYS_TO_EARN_TAB_TEST_IDS } from '../../../app/components/UI/Rewards/components/Money/Tabs/WaysToEarnTab.testIds';
import { Assertions, Matchers, type AppiumElement } from '../../framework';

const DEEPLINK_SCREEN_TIMEOUT = 20_000;

class RewardsMoneyView {
  get waysToEarnTab(): Promise<AppiumElement> {
    return Matchers.getElementByID(WAYS_TO_EARN_TAB_TEST_IDS.CONTAINER);
  }

  get claimedButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      CLAIMABLE_REWARDS_CARD_TEST_IDS.CLAIMED_BUTTON,
    );
  }

  async expectWaysToEarnVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.waysToEarnTab, {
      timeout: DEEPLINK_SCREEN_TIMEOUT,
      description:
        'Rewards Money dashboard opens on the Ways to earn tab after the money campaign deeplink',
    });
  }

  async expectClaimedEarnings(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.claimedButton, {
      timeout: DEEPLINK_SCREEN_TIMEOUT,
      description: 'Claimed earnings stay on the Ways to earn tab',
    });
  }
}

export default new RewardsMoneyView();
