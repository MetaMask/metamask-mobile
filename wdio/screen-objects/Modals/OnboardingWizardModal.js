import {
  ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
  ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
  ONBOARDING_WIZARD_STEP_1_TAKE_THE_TOUR_ID,
  ONBOARDING_WIZARD_YOUR_ACCOUNTS_DESC_1,
  ONBOARDING_WIZARD_YOUR_ACCOUNTS_DESC_2,
  ONBOARDING_WIZARD_BACK_BUTTON,
  ONBOARDING_WIZARD_NEXT_GOT_IT_BUTTON,
  ONBOARDING_WIZARD_SKIP_TUTORIAL_BUTTON,
  ONBOARDING_WIZARD_EDIT_ACCOUNTS_NAME_DESC_1,
  ONBOARDING_WIZARD_EDIT_ACCOUNTS_NAME_DESC_2,
  ONBOARDING_WIZARD_MAIN_NAVIGATION_DESC_1,
  ONBOARDING_WIZARD_MAIN_NAVIGATION_DESC_2,
  ONBOARDING_WIZARD_EXPLORE_BROWSER_DESC,
  ONBOARDING_WIZARD_SEARCH_DESC,
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

  get onBoardingWizardYourAccountDesc1() {
    return Selectors.getXpathElementByText(
      ONBOARDING_WIZARD_YOUR_ACCOUNTS_DESC_1,
    );
  }

  get onBoardingWizardYourAccountDesc2() {
    return Selectors.getXpathElementByText(
      ONBOARDING_WIZARD_YOUR_ACCOUNTS_DESC_2,
    );
  }

  get onBoardingWizardSkipTutorialButton() {
    return Selectors.getElementByPlatform(
      ONBOARDING_WIZARD_SKIP_TUTORIAL_BUTTON,
    );
  }

  get onBoardingWizardGotItButton() {
    return Selectors.getXpathElementByText(
      ONBOARDING_WIZARD_NEXT_GOT_IT_BUTTON,
    );
  }

  get onBoardingWizardEditAccountNameDesc1() {
    return Selectors.getXpathElementByText(
      ONBOARDING_WIZARD_EDIT_ACCOUNTS_NAME_DESC_1,
    );
  }

  get onBoardingWizardEditAccountNameDesc2() {
    return Selectors.getXpathElementByText(
      ONBOARDING_WIZARD_EDIT_ACCOUNTS_NAME_DESC_2,
    );
  }

  get onBoardingWizardMainNavDesc1() {
    return Selectors.getXpathElementByText(
      ONBOARDING_WIZARD_MAIN_NAVIGATION_DESC_1,
    );
  }

  get onBoardingWizardMainNavDesc2() {
    return Selectors.getXpathElementByText(
      ONBOARDING_WIZARD_MAIN_NAVIGATION_DESC_2,
    );
  }

  get onBoardingWizardExploreBrowserDesc() {
    return Selectors.getXpathElementByText(
      ONBOARDING_WIZARD_EXPLORE_BROWSER_DESC,
    );
  }

  get onBoardingWizardSearchDesc() {
    return Selectors.getXpathElementByText(ONBOARDING_WIZARD_SEARCH_DESC);
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

  async isYourAccountDesc1Displayed() {
    await expect(this.onBoardingWizardYourAccountDesc1).toBeDisplayed();
  }

  async isYourAccountDesc2Displayed() {
    await expect(this.onBoardingWizardYourAccountDesc2).toBeDisplayed();
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
    await expect(this.onBoardingWizardGotItButton).not.toBeDisplayed();
  }

  async tapBackButton() {
    await Gestures.tap(this.onBoardingWizardBackButton);
  }

  async isEditAccountNameDesc1Displayed() {
    await expect(this.onBoardingWizardEditAccountNameDesc1).toBeDisplayed();
  }

  async isEditAccountNameDesc2Displayed() {
    await expect(this.onBoardingWizardEditAccountNameDesc2).toBeDisplayed();
  }

  async isMainNavDesc1Displayed() {
    await expect(this.onBoardingWizardMainNavDesc1).toBeDisplayed();
  }

  async isMainNavDesc2Displayed() {
    await expect(this.onBoardingWizardMainNavDesc2).toBeDisplayed();
  }

  async isExploreBrowserDescDisplayed() {
    await expect(this.onBoardingWizardExploreBrowserDesc).toBeDisplayed();
  }

  async isSearchDescDisplayed() {
    await expect(this.onBoardingWizardSearchDesc).toBeDisplayed();
  }
}

export default new OnboardingWizardModal();
