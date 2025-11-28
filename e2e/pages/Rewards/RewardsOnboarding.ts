import { REWARDS_VIEW_SELECTORS } from '../../../app/components/UI/Rewards/Views/RewardsView.constants';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class RewardsClaimBonus {
  get rewardsClaimBonusButton(): DetoxElement {
    return Matchers.getElementByID(REWARDS_VIEW_SELECTORS.CLAIM_BUTTON);
  }

  get rewardsOnboardingNextButton(): DetoxElement {
    return Matchers.getElementByID(REWARDS_VIEW_SELECTORS.NEXT_BUTTON);
  }

  get rewardsOnboardingInfoScreen1(): DetoxElement {
    return Matchers.getElementByText('Earn points on every trade');
  }

  get rewardsOnboardingInfoScreen2(): DetoxElement {
    return Matchers.getElementByText('Level up for bigger perks');
  }

  get rewardsOnboardingInfoScreen3(): DetoxElement {
    return Matchers.getElementByText('Exclusive seasonal rewards');
  }

  get rewardsOnboardingInfoScreen4(): DetoxElement {
    return Matchers.getElementByText(
      "You'll earn 250 points when you sign up!",
    );
  }

  async tapRewardsClaimBonusButton(): Promise<void> {
    await Gestures.waitAndTap(this.rewardsClaimBonusButton, {
      elemDescription: 'Rewards Claim 250 points button',
    });
  }

  async existsRewardsOnboardingInfoScreen1() {
    await Assertions.expectElementToBeVisible(
      this.rewardsOnboardingInfoScreen1,
      {
        elemDescription:
          'Rewards Onboarding Info Screen - Earn points on every trade',
      },
    );
  }

  async existsRewardsOnboardingInfoScreen2() {
    await Assertions.expectElementToBeVisible(
      this.rewardsOnboardingInfoScreen2,
      {
        elemDescription:
          'Rewards Onboarding Info Screen 2 - Level up for bigger perks',
      },
    );
  }

  async existsRewardsOnboardingInfoScreen3() {
    await Assertions.expectElementToBeVisible(
      this.rewardsOnboardingInfoScreen3,
      {
        elemDescription:
          'Rewards Onboarding Info Screen 3 - Exclusive seasonal rewards',
      },
    );
  }

  async existsRewardsOnboardingInfoScreen4() {
    await Assertions.expectElementToBeVisible(
      this.rewardsOnboardingInfoScreen4,
      {
        elemDescription:
          "Rewards Onboarding Info Screen 4 - You'll earn 250 points when you sign up!",
      },
    );
  }

  async tapRewardsOnboardingNextButton(): Promise<void> {
    await Gestures.waitAndTap(this.rewardsOnboardingNextButton, {
      elemDescription: 'Rewards Onboarding Next Button',
    });
  }
}

export default new RewardsClaimBonus();
