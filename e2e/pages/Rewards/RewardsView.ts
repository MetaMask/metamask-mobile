import { Gestures, Matchers } from '../../framework';

class RewardsView {
  get rewardsOverviewTabButton(): DetoxElement {
    return Matchers.getElementByID('rewards-view-tab-control-bar-tab-0');
  }

  get rewardActivityTabButton(): DetoxElement {
    return Matchers.getElementByID('rewards-view-tab-control-bar-tab-2');
  }

  get rewardLevelsTabButton(): DetoxElement {
    return Matchers.getElementByID('rewards-view-tab-control-bar-tab-1');
  }

  get seasonStatusLevel(): DetoxElement {
    return Matchers.getElementByID('season-status-level');
  }

  get seasonStatusTierName(): DetoxElement {
    return Matchers.getElementByID('season-status-tier-name');
  }

  get seasonStatusPoints(): DetoxElement {
    return Matchers.getElementByID('season-status-points');
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
