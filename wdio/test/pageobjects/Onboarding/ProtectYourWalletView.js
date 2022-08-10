import Gestures from '../Gestures';

const PROTECT_YOUR_WALLET_CONTAINER_ID = 'protect-your-account-screen';
const REMIND_ME_LATER_BUTTON_ID = 'remind-me-later-button';
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
