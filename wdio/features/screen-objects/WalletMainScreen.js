import { ONBOARDING_WIZARD_STEP_1_CONTAINER_ID } from '../testIDs/Components/OnboardingWizard.testIds';

class WalletMainScreen {
  async validateOnboardingWizard() {
    const elem = await $(`~${ONBOARDING_WIZARD_STEP_1_CONTAINER_ID}`);
    await expect(elem).toBeDisplayed();
    const elem2 = await $(`~wallet-screen`);
    await expect(elem2).toBeDisplayed();
    await driver.pause(2000);
    const elem3 = await $(`~identicon`);
    await expect(elem3).toBeDisplayed();
    await driver.pause(2000);
  }
}

export default new WalletMainScreen();
