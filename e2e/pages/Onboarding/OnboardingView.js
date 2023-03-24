import { WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID } from '../../../wdio/screen-objects/testIDs/Screens/WalletSetupScreen.testIds';
import TestHelpers from '../../helpers';
const ONBOARDING_SCREEN_ID = 'onboarding-screen';
const IMPORT_FROM_SEED_BUTTON_ID =
  'wallet-setup-screen-import-from-seed-button-id';
//const importUsingSecretRecoveryPhrase = 'import-from-seed-import-from-seed-button';
export default class OnboardingView {
  static async tapCreateWallet() {
    await TestHelpers.tap(WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID);
  }

  static async tapImportWalletFromSeedPhrase() {
    await TestHelpers.tap(IMPORT_FROM_SEED_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ONBOARDING_SCREEN_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ONBOARDING_SCREEN_ID);
  }
}
