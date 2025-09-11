import Gestures from "../helpers/Gestures";
import Selectors from "../helpers/Selectors";
import AppwrightSelectors from "../helpers/AppwrightSelectors";
import { expect as appwrightExpect } from 'appwright';
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
      return AppwrightSelectors.getElementByID(this._device, LoginViewSelectors.CONTAINER);
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
    if (!this._device) {
    return Selectors.getXpathElementByResourceId(
        LoginViewSelectors.PASSWORD_INPUT,
      );
    } else {
      return AppwrightSelectors.getElementByID(this._device, LoginViewSelectors.PASSWORD_INPUT);
    }
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
    if (!this._device) {
      return Selectors.getXpathElementByText("Unlock");
    } else {
      return AppwrightSelectors.getElementByText(this._device, "Unlock");
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
    return Selectors.getXpathElementByResourceId(
      LoginViewSelectors.REMEMBER_ME_SWITCH,
    );
  }

  async isLoginScreenVisible() {
    await expect(await this.loginScreen).toBeDisplayed();
  }

  async waitForScreenToDisplay() {
    if (!this._device) {
    const element = await this.loginScreen;
    await element.waitForDisplayed({ interval: 100 });
    } else {
      const element = await this.loginScreen;
      await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    }
  }

  async tapResetWalletButton() {
    await Gestures.waitAndTap(this.resetWalletButton);
  }

  async typePassword(password) {

    if (!this._device) {
      await this.isLoginScreenVisible();
      await Gestures.typeText(this.passwordInput, password);
    } else {
      const element = await this.passwordInput;
      await element.fill(password);
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
    await Gestures.waitAndTap(this.rememberMeToggle);
  }
}

export default new LoginScreen();
