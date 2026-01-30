import { REWARDS_VIEW_SELECTORS } from '../../../app/components/UI/Rewards/Views/RewardsView.constants';
import { Gestures, Matchers } from '../../../tests/framework';

class RewardsView {
  get rewardsOverviewTabButton(): DetoxElement {
    return Matchers.getElementByID(
      `${REWARDS_VIEW_SELECTORS.TAB_CONTROL}-bar-tab-0`,
    );
  }

  get rewardActivityTabButton(): DetoxElement {
    return Matchers.getElementByID(
      `${REWARDS_VIEW_SELECTORS.TAB_CONTROL}-bar-tab-2`,
    );
  }

  get rewardLevelsTabButton(): DetoxElement {
    return Matchers.getElementByID(
      `${REWARDS_VIEW_SELECTORS.TAB_CONTROL}-bar-tab-1`,
    );
  }

  get seasonStatusLevel(): DetoxElement {
    return Matchers.getElementByID(REWARDS_VIEW_SELECTORS.SEASON_STATUS_LEVEL);
  }

  get seasonStatusTierName(): DetoxElement {
    return Matchers.getElementByID(
      REWARDS_VIEW_SELECTORS.SEASON_STATUS_TIER_NAME,
    );
  }

  get seasonStatusPoints(): DetoxElement {
    return Matchers.getElementByID(REWARDS_VIEW_SELECTORS.SEASON_STATUS_POINTS);
  }

  async tapRewardsOverviewTabButton(): Promise<void> {
    await Gestures.waitAndTap(this.rewardsOverviewTabButton, {
      elemDescription: 'Rewards Overview Tab Button',
    });
  }

  async tapRewardActivityTabButton(): Promise<void> {
    await Gestures.waitAndTap(this.rewardActivityTabButton, {
      elemDescription: 'Reward Activity Tab Button',
    });
  }

  async tapRewardLevelsTabButton(): Promise<void> {
    await Gestures.waitAndTap(this.rewardLevelsTabButton, {
      elemDescription: 'Reward Levels Tab Button',
    });
  }
}

export default new RewardsView();
