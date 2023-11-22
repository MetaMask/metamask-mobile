import TestHelpers from '../../helpers';
import { ProtectWallet } from '../../selectors/Onboarding/ProtectWallet.selectors';

export default class ProtectYourWalletView {
  static async tapOnRemindMeLaterButton() {
    await TestHelpers.tap(ProtectWallet.REMIND_ME_LATER_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ProtectWallet.CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ProtectWallet.CONTAINER_ID);
  }
}
