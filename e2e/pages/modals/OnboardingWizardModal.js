import {
  ONBOARDING_WIZARD_BACK_BUTTON,
  ONBOARDING_WIZARD_FIFTH_STEP_CONTENT_ID,
  ONBOARDING_WIZARD_FOURTH_STEP_CONTENT_ID,
  ONBOARDING_WIZARD_NEXT_GOT_IT_BUTTON,
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
    if (device.getPlatform() === 'ios') {
      await TestHelpers.waitAndTap(ONBOARDING_WIZARD_NEXT_GOT_IT_BUTTON);
    } else {
      await TestHelpers.waitAndTapByLabel(ONBOARDING_WIZARD_NEXT_GOT_IT_BUTTON);
    }
  }

  static async tapBackButton() {
    await TestHelpers.waitAndTap(ONBOARDING_WIZARD_BACK_BUTTON);
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
