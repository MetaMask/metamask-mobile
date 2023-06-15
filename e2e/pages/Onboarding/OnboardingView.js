import { WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID } from '../../../wdio/screen-objects/testIDs/Screens/WalletSetupScreen.testIds';
import TestHelpers from '../../helpers';
import messages from '../../../locales/languages/en.json';
import { NOTIFICATION_TITLE } from '../../../wdio/screen-objects/testIDs/Components/Notification.testIds';

const ONBOARDING_SCREEN_ID = 'onboarding-screen';
const IMPORT_FROM_SEED_BUTTON_ID =
  'wallet-setup-screen-import-from-seed-button-id';
const DeletePasswordString = messages.onboarding.your_wallet;

export default class OnboardingView {
  static async tapCreateWallet() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(
        WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID,
      );
    } else {
      await TestHelpers.waitAndTap(WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID);
    }
  }

  static async tapImportWalletFromSeedPhrase() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(IMPORT_FROM_SEED_BUTTON_ID);
    } else {
      await TestHelpers.tap(IMPORT_FROM_SEED_BUTTON_ID);
    }
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ONBOARDING_SCREEN_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ONBOARDING_SCREEN_ID);
  }
  static async isDeleteWalletToastVisible() {
    await TestHelpers.checkIfElementHasString(
      NOTIFICATION_TITLE,
      DeletePasswordString,
    );
  }
  static async deleteWalletToastisNotVisible() {
    await TestHelpers.checkIfVisible(NOTIFICATION_TITLE);
  }
}
