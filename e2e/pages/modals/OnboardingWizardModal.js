import { ONBOARDING_WIZARD_STEP_1_CONTAINER_ID } from '../../../wdio/screen-objects/testIDs/Components/OnboardingWizard.testIds';
import TestHelpers from '../../helpers';

const NO_THANKS_BUTTON_ID = 'onboarding-wizard-back-button';
const TAKE_TOUR_BUTTON_ID = 'onboarding-wizard-next-button';
const SECOND_STEP_BUTTON_ID = 'step2-title';
const THIRD_STEP_BUTTON_ID = 'step3-title';
const FOURTH_STEP_BUTTON_ID = 'step4-title';
const FIFTH_STEP_BUTTON_ID = 'step5-title';
const SIXTH_STEP_BUTTON_ID = 'step6-title';

export default class OnboardingWizardModal {
  static async tapNoThanksButton() {
    await TestHelpers.waitAndTap(NO_THANKS_BUTTON_ID);
  }
  static async tapTakeTourButton() {
    await TestHelpers.waitAndTap(TAKE_TOUR_BUTTON_ID);
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
    await TestHelpers.checkIfVisible(SECOND_STEP_BUTTON_ID);
  }
  static async isEditAccountNameTutorialStepVisible() {
    await TestHelpers.checkIfVisible(THIRD_STEP_BUTTON_ID);
  }
  static async isMainNavigationTutorialStepVisible() {
    await TestHelpers.checkIfVisible(FOURTH_STEP_BUTTON_ID);
  }
  static async isExploreTheBrowserTutorialStepVisible() {
    await TestHelpers.checkIfVisible(FIFTH_STEP_BUTTON_ID);
  }
  static async isBrowserSearchStepTutorialVisible() {
    await TestHelpers.checkIfVisible(SIXTH_STEP_BUTTON_ID);
  }
}
