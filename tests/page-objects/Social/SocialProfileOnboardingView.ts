import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';
import { SocialProfileOnboardingSelectorsIDs } from '../../../app/components/Views/SocialLeaderboard/ProfileOnboarding/SocialProfileOnboardingView.testIds';

class SocialProfileOnboardingView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SocialProfileOnboardingSelectorsIDs.CONTAINER,
    );
  }

  get intro(): Promise<AppiumElement> {
    return Matchers.getElementByID(SocialProfileOnboardingSelectorsIDs.INTRO);
  }

  get createManuallyButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
    );
  }

  get usernameStep(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SocialProfileOnboardingSelectorsIDs.USERNAME_STEP,
    );
  }

  get avatarStep(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SocialProfileOnboardingSelectorsIDs.AVATAR_STEP,
    );
  }

  get accountStep(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SocialProfileOnboardingSelectorsIDs.ACCOUNT_STEP,
    );
  }

  get readyStep(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SocialProfileOnboardingSelectorsIDs.READY_STEP,
    );
  }

  get continueButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON,
    );
  }

  get letsGoButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON,
    );
  }

  async tapCreateManuallyButton(): Promise<void> {
    await Gestures.waitAndTap(this.createManuallyButton, {
      elemDescription: 'Social profile onboarding - Create manually button',
    });
  }

  async tapContinueButton(): Promise<void> {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Social profile onboarding - Continue button',
    });
  }

  async tapLetsGoButton(): Promise<void> {
    await Gestures.waitAndTap(this.letsGoButton, {
      elemDescription: 'Social profile onboarding - Lets go button',
      waitForInteractive: true,
    });
  }
}

export default new SocialProfileOnboardingView();
