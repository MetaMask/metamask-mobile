import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { LoginViewSelectors } from '../../app/components/Views/Login/LoginView.testIds';
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
    return Selectors.getXpathElementByResourceId(
      LoginViewSelectors.RESET_WALLET,
    );
  }

  get passwordInput() {
    // Always return the same selector for backward compatibility
    // The actual element resolution will be handled in async methods
    return Selectors.getXpathElementByResourceId(
      LoginViewSelectors.PASSWORD_INPUT,
    );
  }

  get getPasswordInputElement() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        LoginViewSelectors.PASSWORD_INPUT,
      );
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        return AppwrightSelectors.getElementByID(
          this._device,
          LoginViewSelectors.PASSWORD_INPUT,
        );
      } else {
        return AppwrightSelectors.getElementByID(this._device, "textfield", true);
      }
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
      return AppwrightSelectors.getElementByID(this._device,'log-in-button');
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
      await AppwrightGestures.tap(await this.resetWalletButton);
    }
  }

  async typePassword(password) {
    //await this.isLoginScreenVisible();
    if (!this._device) {
      await Gestures.typeText(this.passwordInput, password);
    } else {
      const element = await this.getPasswordInputElement;
      await AppwrightGestures.typeText(element, password);
      await AppwrightGestures.hideKeyboard(this._device);

    }
  }

  async tapUnlockButton() {
    if (!this._device) {
      const element = await this.unlockButton;
      await element.click();
    } else {
      await AppwrightGestures.tap(await this.unlockButton);
    }
  }

  async tapTitle() {
    if (!this._device) {
      await Gestures.waitAndTap(this.title);
    } else {
      await AppwrightGestures.tap(await this.title);
    }
  }

  async tapRememberMeToggle() {
    if (!this._device) {
      await Gestures.waitAndTap(this.rememberMeToggle);
    } else {
      await AppwrightGestures.tap(await this.rememberMeToggle);
    }
  }
}

export default new LoginScreen();
