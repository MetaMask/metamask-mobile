import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  LOGIN_VIEW_PASSWORD_INPUT_ID,
  LOGIN_VIEW_RESET_WALLET_ID,
  LOGIN_VIEW_SCREEN_ID,
  LOGIN_VIEW_TITLE_ID,
  LOGIN_VIEW_UNLOCK_BUTTON_ID,
} from './testIDs/Screens/LoginScreen.testIds';

class LoginScreen {
  get loginScreen() {
    return Selectors.getElementByPlatform(LOGIN_VIEW_SCREEN_ID);
  }

  get resetWalletButton() {
    return Selectors.getElementByPlatform(LOGIN_VIEW_RESET_WALLET_ID);
  }

  get passwordInput() {
    return Selectors.getElementByPlatform(LOGIN_VIEW_PASSWORD_INPUT_ID);
  }

  get unlockButton() {
    return Selectors.getElementByPlatform(LOGIN_VIEW_UNLOCK_BUTTON_ID);
  }

  get title() {
    return Selectors.getElementByPlatform(LOGIN_VIEW_TITLE_ID);
  }

  async isLoginScreenVisible() {
    await expect(this.loginScreen).toBeDisplayed();
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
}

export default new LoginScreen();
