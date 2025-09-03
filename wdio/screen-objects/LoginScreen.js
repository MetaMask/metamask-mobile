import Gestures from "../helpers/Gestures";
import Selectors from "../helpers/Selectors";
import AppwrightSelectors from "../helpers/AppwrightSelectors";
import { LoginViewSelectors } from "../../e2e/selectors/wallet/LoginView.selectors";

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

  async getPasswordInputElement() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        LoginViewSelectors.PASSWORD_INPUT,
      );
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        return await AppwrightSelectors.getElementByID(
          this._device,
          LoginViewSelectors.PASSWORD_INPUT,
        );
      } else {
        return await AppwrightSelectors.getElementByID(this._device, "textfield");
      }
    }
  }

  get unlockButton() {
    // TODO: update the component to have a testID property and use that instead of text
    return Selectors.getXpathElementByText("Unlock");
  }

  get title() {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(LoginViewSelectors.TITLE_ID);
    } else {
      return AppwrightSelectors.getElementByID(this._device, LoginViewSelectors.TITLE_ID);
    }
  }

  get rememberMeToggle() {
    return Selectors.getXpathElementByResourceId(
      LoginViewSelectors.REMEMBER_ME_SWITCH,
    );
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
    await Gestures.typeText(this.passwordInput, password);
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
