import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  LOGIN_VIEW_PASSWORD_INPUT_ID,
  LOGIN_VIEW_RESET_WALLET_ID,
  LOGIN_VIEW_SCREEN_ID,
  LOGIN_VIEW_TITLE_ID,
  LOGIN_VIEW_UNLOCK_BUTTON_ID,
  LOGIN_WITH_REMEMBER_ME_SWITCH,
} from './testIDs/Screens/LoginScreen.testIds';

class LoginScreen {
  get loginScreen() {
    return Selectors.getXpathElementByResourceId(LOGIN_VIEW_SCREEN_ID);
  }

  get resetWalletButton() {
    return Selectors.getXpathElementByResourceId(LOGIN_VIEW_RESET_WALLET_ID);
  }

  get passwordInput() {
    return Selectors.getXpathElementByResourceId(LOGIN_VIEW_PASSWORD_INPUT_ID);
  }

  get unlockButton() {
    return Selectors.getXpathElementByResourceId(LOGIN_VIEW_UNLOCK_BUTTON_ID);
  }

  get title() {
    return Selectors.getXpathElementByResourceId(LOGIN_VIEW_TITLE_ID);
  }

  get rememberMeToggle() {
    return Selectors.getXpathElementByResourceId(LOGIN_WITH_REMEMBER_ME_SWITCH);
  }

  async isLoginScreenVisible() {
    await expect(await this.loginScreen).toBeDisplayed();
  }

  async waitForScreenToDisplay() {
    const element = await this.loginScreen;
    await element.waitForDisplayed({ interval: 500 });
  }

  async tapResetWalletButton() {
    await Gestures.waitAndTap(this.resetWalletButton);
  }

  async typePassword(password) {
    await Gestures.typeText(this.passwordInput, password);
  }

  async tapUnlockButton() {
    await Gestures.waitAndTap(this.unlockButton);
  }

  async tapTitle() {
    await Gestures.waitAndTap(this.title);
  }

  async tapRememberMeToggle() {
    await Gestures.waitAndTap(this.rememberMeToggle);
  }

  async isRememberMeToggle(value) {
    await expect(this.rememberMeToggle).toHaveText(value);
  }
}

export default new LoginScreen();
