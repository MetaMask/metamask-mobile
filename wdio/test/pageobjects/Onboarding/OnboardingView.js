//import TestHelpers from '../../helpers';
import Gestures from '../Gestures';
const ONBOARDING_SCREEN_ID = 'onboarding-screen';
const CREATE_WALLET_BUTTON_ID = 'create-wallet-button';
const IMPORT_WALLET_BUTTON_ID = 'import-wallet-import-from-seed-button';
//const importUsingSecretRecoveryPhrase = 'import-wallet-import-from-seed-button';
class OnboardingView {
  get createWallet() {
    return $(`~${CREATE_WALLET_BUTTON_ID}`);
  }

  async tapCreateWallet() {
    await Gestures.tap(CREATE_WALLET_BUTTON_ID);
  }

  static async tapImportWalletFromSeedPhrase() {
    await TestHelpers.tap(IMPORT_WALLET_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ONBOARDING_SCREEN_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ONBOARDING_SCREEN_ID);
  }
}
export default new OnboardingView();
