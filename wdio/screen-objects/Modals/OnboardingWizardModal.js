import {
  ONBOARDING_WIZARD_BACK_BUTTON,
  ONBOARDING_WIZARD_FIFTH_STEP_CONTENT_ID,
  ONBOARDING_WIZARD_FOURTH_STEP_CONTENT_ID,
  ONBOARDING_WIZARD_NEXT_GOT_IT_BUTTON,
  ONBOARDING_WIZARD_SECOND_STEP_CONTENT_ID,
  ONBOARDING_WIZARD_SIXTH_STEP_CONTENT_ID,
  ONBOARDING_WIZARD_SKIP_TUTORIAL_BUTTON,
  ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
  ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
  ONBOARDING_WIZARD_STEP_1_TAKE_THE_TOUR_ID,
  ONBOARDING_WIZARD_THIRD_STEP_CONTENT_ID,
} from '../testIDs/Components/OnboardingWizard.testIds';

import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

class OnboardingWizardModal {
  get onBoardingWizardContainer() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
    );
  }

  get onBoardingWizardNoThanksButton() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
    );
  }

  get onBoardingWizardBackButton() {
    return Selectors.getXpathElementByText(ONBOARDING_WIZARD_BACK_BUTTON);
  }

  get onBoardingWizardTakeTourButton() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_STEP_1_TAKE_THE_TOUR_ID,
    );
  }

  get step2Description() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_SECOND_STEP_CONTENT_ID,
    );
  }

  get step3Description() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_THIRD_STEP_CONTENT_ID,
    );
  }

  get step4Description() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_FOURTH_STEP_CONTENT_ID,
    );
  }

  get step5Description() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_FIFTH_STEP_CONTENT_ID,
    );
  }

  get step6Description() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_SIXTH_STEP_CONTENT_ID,
    );
  }

  get onBoardingWizardSkipTutorialButton() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_SKIP_TUTORIAL_BUTTON,
    );
  }

  get onBoardingWizardGotItButton() {
    return Selectors.getElementByPlatform(ONBOARDING_WIZARD_NEXT_GOT_IT_BUTTON);
  }

  async isVisible() {
    await expect(this.onBoardingWizardContainer).toBeDisplayed();
  }

  async tapNoThanksButton() {
    await Gestures.tap(this.onBoardingWizardNoThanksButton);
  }

  async tapTakeTourButton() {
    await Gestures.tap(this.onBoardingWizardTakeTourButton);
  }

  async isHeaderDisplayedByXPath(text) {
    await expect(await Selectors.getXpathElementByText(text)).toBeDisplayed();
  }

  async isStep2ContentDisplayed() {
    await expect(await this.step2Description).toBeDisplayed();
  }

  async isStep3ContentDisplayed() {
    await expect(await this.step3Description).toBeDisplayed();
  }

  async isStep4ContentDisplayed() {
    await expect(await this.step4Description).toBeDisplayed();
  }

  async isStep5ContentDisplayed() {
    await expect(await this.step5Description).toBeDisplayed();
  }

  async isStep6ContentDisplayed() {
    await expect(await this.step6Description).toBeDisplayed();
  }

  async isSkipTutorialButtonDisplayed() {
    await expect(this.onBoardingWizardSkipTutorialButton).toBeDisplayed();
  }

  async isSkipTutorialButtonNotDisplayed() {
    await expect(this.onBoardingWizardSkipTutorialButton).not.toBeDisplayed();
  }

  async tapSkipTutorialButton() {
    await Gestures.tap(this.onBoardingWizardSkipTutorialButton);
  }

  async tapGotItButton() {
    await Gestures.tap(this.onBoardingWizardGotItButton);
  }

  async isGotItButtonNotDisplayed() {
    await expect(this.onBoardingWizardGotItButton).not.toBeExisting();
  }

  async tapBackButton() {
    await Gestures.tap(this.onBoardingWizardBackButton);
  }
}

export default new OnboardingWizardModal();
