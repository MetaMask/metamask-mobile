import TestHelpers from '../../helpers';

const PROTECT_YOUR_WALLET_CONTAINER_ID = 'protect-your-account-screen';
const REMIND_ME_LATER_BUTTON_ID = 'remind-me-later-button';
export default class ProtectYourWalletView {
  static async tapOnRemindMeLaterButton() {
    await TestHelpers.tap(REMIND_ME_LATER_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(PROTECT_YOUR_WALLET_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(PROTECT_YOUR_WALLET_CONTAINER_ID);
  }
}
