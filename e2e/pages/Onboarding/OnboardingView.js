import { WALLET_SETUP_CREATE_NEW_WALLET_BUTTON_ID } from '../../../wdio/screen-objects/testIDs/Screens/WalletSetupScreen.testIds';
import TestHelpers from '../../helpers';
import { NOTIFICATION_TITLE } from '../../../wdio/screen-objects/testIDs/Components/Notification.testIds';
import { OnboardingSelectorIDs } from '../../selectors/Onboarding/Onboarding.selectors';

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
      await TestHelpers.waitAndTapByLabel(
        OnboardingSelectorIDs.IMPORT_FROM_SEED_BUTTON_ID,
      );
    } else {
      await TestHelpers.tap(OnboardingSelectorIDs.IMPORT_FROM_SEED_BUTTON_ID);
    }
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(OnboardingSelectorIDs.CONTAINER_ID);
  }

  static async deleteWalletToastIsNotVisible() {
    await TestHelpers.checkIfVisible(NOTIFICATION_TITLE);
    await TestHelpers.checkIfNotVisible(NOTIFICATION_TITLE);
  }
}
