import Gestures from '../Gestures';
import {
  PROTECT_YOUR_WALLET_CONTAINER_ID,
  REMIND_ME_LATER_BUTTON_ID,
} from '../../../test-ids';
class ProtectYourWalletView {
  get protectYourWalletContainer() {
    return $(`~${PROTECT_YOUR_WALLET_CONTAINER_ID}`);
  }

  async tapOnRemindMeLaterButton() {
    await Gestures.waitAndTap(REMIND_ME_LATER_BUTTON_ID);
  }

  async isVisible() {
    await expect(this.protectYourWalletContainer).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.protectYourWalletContainer).not.toBeDisplayed();
  }
}
export default new ProtectYourWalletView();
