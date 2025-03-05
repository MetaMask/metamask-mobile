import { OnboardingWizardModalSelectorsIDs } from '../../selectors/Onboarding/OnboardingWizardModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class OnboardingWizardModal {
  get stepOneContainer() {
    return Matchers.getElementByID(
      OnboardingWizardModalSelectorsIDs.STEP_ONE_CONTAINER,
    );
  }

  get stepTwoContainer() {
    return Matchers.getElementByID(
      OnboardingWizardModalSelectorsIDs.STEP_TWO_CONTAINER,
    );
  }

  get stepThreeContainer() {
    return Matchers.getElementByID(
      OnboardingWizardModalSelectorsIDs.STEP_THREE_CONTAINER,
    );
  }

  get stepFourContainer() {
    return Matchers.getElementByID(
      OnboardingWizardModalSelectorsIDs.STEP_FOUR_CONTAINER,
    );
  }

  get stepFiveContainer() {
    return Matchers.getElementByID(
      OnboardingWizardModalSelectorsIDs.STEP_FIVE_CONTAINER,
    );
  }

  get stepSixContainer() {
    return Matchers.getElementByID(
      OnboardingWizardModalSelectorsIDs.STEP_SIX_CONTAINER,
    );
  }

  get stepSevenContainer() {
    return Matchers.getElementByID(
      OnboardingWizardModalSelectorsIDs.STEP_SEVENTH_CONTAINER,
    );
  }

  get noThanksButton() {
    return Matchers.getElementByID(
      OnboardingWizardModalSelectorsIDs.NO_THANKS_BUTTON,
    );
  }

  get takeTourButton() {
    return Matchers.getElementByID(
      OnboardingWizardModalSelectorsIDs.TAKE_TOUR_BUTTON,
    );
  }

  get gotItButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(OnboardingWizardModalSelectorsIDs.GOT_IT_BUTTON)
      : Matchers.getElementByLabel(
          OnboardingWizardModalSelectorsIDs.GOT_IT_BUTTON,
        );
  }

  get backButton() {
    return Matchers.getElementByID(
      OnboardingWizardModalSelectorsIDs.BACK_BUTTON,
    );
  }

  async tapNoThanksButton() {
    await Gestures.waitAndTap(this.noThanksButton);
  }

  async tapTakeTourButton() {
    await Gestures.waitAndTap(this.takeTourButton);
  }

  async tapGotItButton() {
    await Gestures.waitAndTap(this.gotItButton);
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }
}

export default new OnboardingWizardModal();
