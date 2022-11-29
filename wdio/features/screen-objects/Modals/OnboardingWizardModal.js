  import { ONBOARDING_WIZARD_STEP_1_CONTAINER_ID,
    ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID } from '../../testIDs/Components/OnboardingWizard.testIds';

  import Selectors from '../../helpers/Selectors';
  import Gestures from '../../helpers/Gestures';


class OnboardingWizardModal {

  get onBoardingWizardContainer() {
    return Selectors.getElementByPlatform(ONBOARDING_WIZARD_STEP_1_CONTAINER_ID);
  }

  get onBoardingWizardBackButton() {
    return Selectors.getElementByPlatform(ONBOARDING_WIZARD_STEP_1_NO_THANKS_ID);
  }

  async isVisible(){
    await expect(this.onBoardingWizardContainer).toBeDisplayed();
  }

  async clickBackButton(){
    await Gestures.tap(this.onBoardingWizardBackButton);
  }

}
export default new OnboardingWizardModal();
