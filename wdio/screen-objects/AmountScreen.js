import AppwrightSelectors from '../helpers/AppwrightSelectors';
import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  AMOUNT_ERROR,
  AMOUNT_SCREEN,
  NEXT_BUTTON,
  TRANSACTION_AMOUNT_INPUT,
} from './testIDs/Screens/AmountScreen.testIds';

class AmountScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get amountInputField() {
    if (!this._device) {
      return Selectors.getElementByPlatform(TRANSACTION_AMOUNT_INPUT);
    } else {
      return AppwrightSelectors.getElementByID(this._device, TRANSACTION_AMOUNT_INPUT);
    }
  }

  get amountScreen() {
    if (!this._device) {
      return Selectors.getElementByPlatform(AMOUNT_SCREEN);
    } else {
      return AppwrightSelectors.getElementByID(this._device, AMOUNT_SCREEN);
    }
  }

  get amountError() {
    return Selectors.getElementByPlatform(AMOUNT_ERROR);
  }

  get nextButton() {
    if (!this._device) {
      return Selectors.getElementByPlatform(NEXT_BUTTON);
    } else {
      return AppwrightSelectors.getElementByID(this._device, NEXT_BUTTON);
    }
  }

  async enterAmount(text) {
    if (!this._device) {
      await Gestures.waitAndTap(this.amountInputField);
      await Gestures.typeText(this.amountInputField, text);
    } else {
      const element = await AppwrightSelectors.getElementByID(this._device, TRANSACTION_AMOUNT_INPUT);
      await element.fill(text);
    }
  }

  async isTokenCorrect(token) {
    expect(this.confirmAmount).toHaveText(token);
  }

  async waitForAmountErrorMessage() {
    const amountError = await this.amountError;
    await amountError.waitForDisplayed();
  }

  async waitNextButtonEnabled() {
    const nextButton = await this.nextButton;
    await nextButton.waitForEnabled();
  }

  async tapOnNextButton() {
    const element = await this.nextButton;
    await element.tap();
  }
}

export default new AmountScreen();
