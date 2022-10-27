  import { ONBOARDING_WIZARD_STEP_1_CONTAINER_ID } from '../../testIDs/Components/OnboardingWizard.testIds';

  import Selectors from '../../helpers/Selectors';

class OnboardingWizardModal {

  get onBoardingWizardContainer() {
    return Selectors.getElementByPlatform(ONBOARDING_WIZARD_STEP_1_CONTAINER_ID);
  }


  async isVisible(){
    await expect(this.onBoardingWizardContainer).toBeDisplayed();
  }

}
export default new OnboardingWizardModal();
