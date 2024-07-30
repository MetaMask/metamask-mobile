import { OnboardingWizardModalSelectorsIDs } from '../../../e2e/selectors/Modals/OnboardingWizardModal.selectors';
import Selectors from '../../helpers/Selectors';
import Gestures from '../../helpers/Gestures';

class OnboardingWizardModal {
  get container() {
    return Selectors.getXpathElementByResourceId(
      OnboardingWizardModalSelectorsIDs.STEP_ONE_CONTAINER,
    );
  }

  get noThanksButton() {
    return Selectors.getXpathElementByResourceId(
      OnboardingWizardModalSelectorsIDs.NO_THANKS_BUTTON,
    );
  }

  get backButton() {
    return Selectors.getElementByPlatform(
      OnboardingWizardModalSelectorsIDs.BACK_BUTTON
    );
  }

  get takeTourButton() {
    return Selectors.getElementByPlatform(
      OnboardingWizardModalSelectorsIDs.TAKE_TOUR_BUTTON,
    );
  }

  get step2Description() {
    return Selectors.getElementByPlatform(
      OnboardingWizardModalSelectorsIDs.STEP_TWO_CONTAINER,
    );
  }

  get step3Description() {
    return Selectors.getElementByPlatform(
      OnboardingWizardModalSelectorsIDs.STEP_THREE_CONTAINER,
    );
  }

  get step4Description() {
    return Selectors.getElementByPlatform(
      OnboardingWizardModalSelectorsIDs.STEP_FOUR_CONTAINER,
    );
  }

  get step5Description() {
    return Selectors.getElementByPlatform(
      OnboardingWizardModalSelectorsIDs.STEP_FIVE_CONTAINER,
    );
  }

  get step6Description() {
    return Selectors.getElementByPlatform(
      OnboardingWizardModalSelectorsIDs.STEP_SIX_CONTAINER,
    );
  }

  get onBoardingWizardGotItButton() {
    return Selectors.getElementByPlatform(
      OnboardingWizardModalSelectorsIDs.GOT_IT_BUTTON
    );
  }

  async isVisible() {
    await expect(this.container).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.container).not.toBeDisplayed();
  }

  async tapNoThanksButton() {
    await Gestures.waitAndTap(this.noThanksButton);
  }

  async tapTakeTourButton() {
    await Gestures.waitAndTap(this.takeTourButton);
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

  async tapGotItButton() {
    await Gestures.tap(this.onBoardingWizardGotItButton);
  }

  async isGotItButtonNotDisplayed() {
    await expect(this.onBoardingWizardGotItButton).not.toBeExisting();
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }
}

export default new OnboardingWizardModal();
