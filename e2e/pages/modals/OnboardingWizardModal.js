import {
  ONBOARDING_WIZARD_FIFTH_STEP_CONTENT_ID,
  ONBOARDING_WIZARD_FOURTH_STEP_CONTENT_ID,
  ONBOARDING_WIZARD_SECOND_STEP_CONTENT_ID,
  ONBOARDING_WIZARD_SIXTH_STEP_CONTENT_ID,
  ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
  ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID,
  ONBOARDING_WIZARD_STEP_1_TAKE_THE_TOUR_ID,
  ONBOARDING_WIZARD_THIRD_STEP_CONTENT_ID,
} from '../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';
import TestHelpers from '../../helpers';

export default class OnboardingWizardModal {
  static async tapNoThanksButton() {
    await TestHelpers.waitAndTap(ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID);
  }

  static async tapTakeTourButton() {
    await TestHelpers.waitAndTap(ONBOARDING_WIZARD_STEP_1_TAKE_THE_TOUR_ID);
  }

  static async tapGotItButton() {
    await TestHelpers.tapByText('Got it!');
  }

  static async tapBackButton() {
    await TestHelpers.tapByText('Back');
  }

  static async tapSkipTutorialButton() {
    await TestHelpers.tapByText('Skip Tutorial');
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ONBOARDING_WIZARD_STEP_1_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ONBOARDING_WIZARD_STEP_1_CONTAINER_ID);
  }

  static async isYourAccountsTutorialStepVisible() {
    await TestHelpers.checkIfVisible(ONBOARDING_WIZARD_SECOND_STEP_CONTENT_ID);
  }

  static async isEditAccountNameTutorialStepVisible() {
    await TestHelpers.checkIfVisible(ONBOARDING_WIZARD_THIRD_STEP_CONTENT_ID);
  }

  static async isMainNavigationTutorialStepVisible() {
    await TestHelpers.checkIfVisible(ONBOARDING_WIZARD_FOURTH_STEP_CONTENT_ID);
  }

  static async isExploreTheBrowserTutorialStepVisible() {
    await TestHelpers.checkIfVisible(ONBOARDING_WIZARD_FIFTH_STEP_CONTENT_ID);
  }

  static async isBrowserSearchStepTutorialVisible() {
    await TestHelpers.checkIfVisible(ONBOARDING_WIZARD_SIXTH_STEP_CONTENT_ID);
  }
}
