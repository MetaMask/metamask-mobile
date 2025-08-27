import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import AppwrightSelectors from '../helpers/AppwrightSelectors.js';
import { LoginViewSelectors } from '../../e2e/selectors/wallet/LoginView.selectors';
import { expect as appwrightExpect } from 'appwright';

class LoginScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get loginScreen() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(LoginViewSelectors.CONTAINER);
    } else {
      return AppwrightSelectors.getElementByResourceId(this._device, LoginViewSelectors.CONTAINER);
    }
  }

  get welcomeBackText() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(LoginViewSelectors.CONTAINER);
    } else {
      return AppwrightSelectors.getElementByText(this._device, 'Welcome Back!');
    }
  }

  get resetWalletButton() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(LoginViewSelectors.RESET_WALLET);
    } else {
      return AppwrightSelectors.getElementByID(this._device, LoginViewSelectors.RESET_WALLET);
    }
  }

  get passwordInput() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(LoginViewSelectors.PASSWORD_INPUT);
    } else {
      return AppwrightSelectors.getElementByID(this._device, LoginViewSelectors.PASSWORD_INPUT);
    }
  }

  get unlockButton() {
    // TODO: update the component to have a testID property and use that instead of text
    if (!this._device) {
      return Selectors.getXpathElementByText('Unlock');
    } else {
      return AppwrightSelectors.getElementByText(this._device, 'Unlock');
    }
  }

  get title() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(LoginViewSelectors.TITLE_ID);
    } else {
      return AppwrightSelectors.getElementByID(this._device, LoginViewSelectors.TITLE_ID);
    }
  }

  get rememberMeToggle() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(LoginViewSelectors.REMEMBER_ME_SWITCH);
    } else {
      return AppwrightSelectors.getElementByID(this._device, LoginViewSelectors.REMEMBER_ME_SWITCH);
    }
  }

  async isLoginScreenVisible() {

    if (!this._device) {
      const element = await this.title;
      await element.waitForDisplayed();
    } else {
      const element = await this.title;
      await appwrightExpect(element).toBeVisible();

    }
  }

  async waitForScreenToDisplay() {
    if (!this._device) {
      const element = await this.title;
      await element.waitForDisplayed({ interval: 100 });
    } else {
      const element = await this.title;
      await appwrightExpect(element).toBeVisible();

    }
  }

  async tapResetWalletButton() {
    if (!this._device) {
      await Gestures.waitAndTap(this.resetWalletButton);
    } else {
      const element = await this.resetWalletButton;
      await element.tap();
    }
  }

  async typePassword(password) {
    await this.isLoginScreenVisible();
    if (!this._device) {
      await Gestures.typeText(this.passwordInput, password);
    } else {
      const screenTitle = await this.title
      const element = await this.passwordInput;
      await element.fill(password);
      await screenTitle.tap()
    }
  }

  async tapUnlockButton() {
    if (!this._device) {
      const element = await this.unlockButton;
      await element.click();
    } else {
      const element = await this.unlockButton;
      await element.tap();
    }
  }

  async tapTitle() {
    if (!this._device) {
      await Gestures.waitAndTap(this.title);
    } else {
      const element = await this.title;
      await element.tap();
    }
  }

  async tapRememberMeToggle() {
    if (!this._device) {
      await Gestures.waitAndTap(this.rememberMeToggle);
    } else {
      const element = await this.rememberMeToggle;
      await element.tap();
    }
  }
}

export default new LoginScreen();
