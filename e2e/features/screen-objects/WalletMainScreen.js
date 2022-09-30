import { ONBOARDING_WIZARD_STEP_1_CONTAINER_ID } from '../../../app/constants/testIDs/Components/OnboardingWizard.testIds';

class WalletMainScreen {
  async validateOnboardingWizard() {
    const elem = await $(`~${ONBOARDING_WIZARD_STEP_1_CONTAINER_ID}`);
    expect(elem).toBeDisplayed();
  }
}

export default new WalletMainScreen();
