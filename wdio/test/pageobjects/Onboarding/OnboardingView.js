//import TestHelpers from '../../helpers';
import Gestures from '../Gestures';
const ONBOARDING_SCREEN_ID = 'onboarding-screen';
const CREATE_WALLET_BUTTON_ID = 'create-wallet-button';
const IMPORT_WALLET_BUTTON_ID = 'import-wallet-import-from-seed-button';
//const importUsingSecretRecoveryPhrase = 'import-wallet-import-from-seed-button';
class OnboardingView {
  get onboardingViewContainer() {
    return $(`~${ONBOARDING_SCREEN_ID}`);
  }

  async tapCreateWallet() {
    await Gestures.waitAndTap(CREATE_WALLET_BUTTON_ID);
  }

  async tapImportWalletFromSeedPhrase() {
    await Gestures.tap(IMPORT_WALLET_BUTTON_ID);
  }

  async isVisible() {
    await expect(this.onboardingViewContainer).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.onboardingViewContainer).not.toBeDisplayed();
  }
}
export default new OnboardingView();
