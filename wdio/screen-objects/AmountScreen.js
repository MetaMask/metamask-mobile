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
import { splitAmountIntoDigits } from 'appwright/utils/Utils';

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
      return AppwrightSelectors.getElementByCatchAll(this._device, 'Continue');
    }
  }

  async tapNumberKey(digit) {
    console.log(`tapNumberKey called with digit: "${digit}"`);
    
    try {
      if (AppwrightSelectors.isAndroid(this._device)) {
        console.log(`Android: Looking for button with content-desc='${digit}'`);
        const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//android.widget.Button[@content-desc='${digit}']`)
        console.log(`Android: Found element, checking visibility`);
        await appwrightExpect(numberKey).toBeVisible({ timeout: 30000 });
        console.log(`Android: Element visible, tapping`);
        await AppwrightGestures.tap(numberKey);
        console.log(`Android: Successfully tapped digit: ${digit}`);
      }
      else {
        console.log(`iOS: Looking for button with name="${digit}"`);
        const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//XCUIElementTypeButton[@name="${digit}"]`);
        console.log(`iOS: Found element, checking visibility`);
        await appwrightExpect(numberKey).toBeVisible({ timeout: 30000 });
        console.log('iOS: Tapping number key:', digit);
        await AppwrightGestures.tap(numberKey);
        console.log(`iOS: Successfully tapped digit: ${digit}`);
      }
    } catch (error) {
      console.error(`Error in tapNumberKey for digit "${digit}":`, error);
      throw error;
    }
  }

  async enterAmount(text) {
    if (!this._device) {
      await Gestures.waitAndTap(this.amountInputField);
      await Gestures.typeText(this.amountInputField, text);
    } else {
        console.log('Direct input failed, falling back to digit tapping');
        // Fallback to digit tapping if direct input fails
        const digits = splitAmountIntoDigits(text);
        for (const digit of digits) {
          console.log('Tapping digit:', digit);
          await this.tapNumberKey(digit);
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
    await AppwrightGestures.tap(await this.nextButton);
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