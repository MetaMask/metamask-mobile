import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import { expect as appwrightExpect } from 'appwright';
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
      return AppwrightSelectors.getElementByText(this._device, 'Continue');
    }
  }
  // Helper method to split amount into digits
  splitAmountIntoDigits(amount) {
    // Convert to string and split into array of digits
    return amount.toString().split('').map(char => {
      // Return only numeric digits, filter out decimal points, commas, etc.
      return /\d/.test(char) ? parseInt(char, 10) : char;
    });
  }

  async enterAmount(text) {
    if (!this._device) {
      await Gestures.waitAndTap(this.amountInputField);
      await Gestures.typeText(this.amountInputField, text);
    } else {
      // Split amount into digits
    const digits = this.splitAmountIntoDigits(text);
    console.log('Amount digits:', digits);
    for (const digit of digits) {
      if (AppwrightSelectors.isAndroid(this._device)) {
        const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//android.widget.Button[@content-desc='${digit}']`)
        await appwrightExpect(numberKey).toBeVisible({ timeout: 30000 });
        await AppwrightGestures.tap(numberKey);
      }
      else {
        const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//XCUIElementTypeButton[@name="${digit}"]`);
        await appwrightExpect(numberKey).toBeVisible({ timeout: 30000 });
        await AppwrightGestures.tap(numberKey);
      }
    }
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
    await AppwrightGestures.tap(this.nextButton, );
  }

  async isVisible() {
    if (!this._device) {
      const element = await this.amountScreen;
      await element.waitForDisplayed();
    } else {
      const element = await AppwrightSelectors.getElementByCatchAll(this._device, '25%');
      await appwrightExpect(element).toBeVisible();
    }
  }
}

export default new AmountScreen();