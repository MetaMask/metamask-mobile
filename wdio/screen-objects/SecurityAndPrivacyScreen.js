import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  SECURITY_PRIVACY_DELETE_WALLET_BUTTON,
  SECURITY_PRIVACY_REMEMBER_ME_TOGGLE,
  SECURITY_PRIVACY_VIEW_ID,
} from './testIDs/Screens/SecurityPrivacy.testIds';

class SecurityAndPrivacyScreen {
  get rememberMeToggle() {
    return Selectors.getElementByPlatform(SECURITY_PRIVACY_REMEMBER_ME_TOGGLE);
  }

  get container() {
    return Selectors.getElementByPlatform(SECURITY_PRIVACY_VIEW_ID);
  }

  get deleteWalletButton() {
    return Selectors.getElementByPlatform(
      SECURITY_PRIVACY_DELETE_WALLET_BUTTON,
    );
  }

  async tapChangePassword() {
    await Gestures.swipe({ x: 200, y: 1000 }, { x: 200, y: 200 });
    await Gestures.tapTextByXpath('Change password');
  }

  async isChangePasswordTextVisible(text) {
    const changePasswordText = await Selectors.getXpathElementByText(text);
    await expect(changePasswordText).toBeDisplayed();
  }

  async tapRememberToggle() {
    const element = await this.rememberMeToggle;
    while (!(await element.isDisplayed())) {
      await Gestures.swipeUp();
    }

    await Gestures.waitAndTap(element);
  }

  async tapDeleteWalletButton() {
    const element = await this.deleteWalletButton;
    while (!(await element.isDisplayed())) {
      await Gestures.swipeUp(0.75);
    }

    await Gestures.waitAndTap(element);
  }

  async tapToskipVideo() {
    await this.isScreenDisplayed();
    await driver.pause(1000);
    await Gestures.tapByCoordinatesPercentage(12.3, 48);
    await driver.pause(1000);
    await Gestures.tapByCoordinatesPercentage(12.3, 48);
  }

  async isRememberMeToggle(value) {
    await expect(this.rememberMeToggle).toHaveText(value);
    await driver.pause(1000);
  }

  async isScreenDisplayed() {
    const element = await this.container;
    await element.waitForDisplayed({ interval: 1000 });
  }
}

export default new SecurityAndPrivacyScreen();
