import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import AppwrightSelectors from '../helpers/AppwrightSelectors.js';
import AppwrightGestures from '../../appwright/utils/AppwrightGestures.js';
import { LoginViewSelectors } from '../../e2e/selectors/wallet/LoginView.selectors';
import { expect as appwrightExpect } from 'appwright';

class LoginScreen extends AppwrightGestures {
  constructor() {
    super();
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
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
        return AppwrightSelectors.getElementByID(this._device, "textfield");
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
      await this.tap(this.resetWalletButton); // Use inherited tapElement method with retry logic
    }
  }

  async typePassword(password) {
    await this.isLoginScreenVisible();
    if (!this._device) {
      await Gestures.typeText(this.passwordInput, password);
    } else {
      const screenTitle = await this.title
      const element = await this.getPasswordInputElement;
      await element.fill(password);
      await screenTitle.tap()
    }
  }

  async tapUnlockButton() {
    if (!this._device) {
      const element = await this.unlockButton;
      await element.click();
    } else {
      await this.tap(this.unlockButton); // Use inherited tapElement method with retry logic
    }
  }

  async tapTitle() {
    if (!this._device) {
      await Gestures.waitAndTap(this.title);
    } else {
      await this.tap(this.title); // Use inherited tapElement method with retry logic
    }
  }

  async tapRememberMeToggle() {
    if (!this._device) {
      await Gestures.waitAndTap(this.rememberMeToggle);
    } else {
      await this.tap(this.rememberMeToggle); // Use inherited tapElement method with retry logic
    }
  }
}

export default new LoginScreen();
