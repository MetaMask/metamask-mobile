import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';
import { splitAmountIntoDigits } from 'appwright/utils/Utils';

class PerpsOrderView {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get placeOrderButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-order-view-place-order-button');
  }

  get keypad() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-order-view-keypad');
  }

  get leverageButton() {
    return AppwrightSelectors.getElementByText(this._device, 'Leverage');
  }

  async leverageOption(leverage) {
    return AppwrightSelectors.getElementByText(this._device, `${leverage}x`);
  }

  async confirmLeverageButton(leverage) {
    return AppwrightSelectors.getElementByText(this._device, `Set ${leverage}x`);
  }

  async tapPlaceOrder() {
    await AppwrightGestures.tap(this.placeOrderButton);
  }

  // Reuse logic from AmountScreen.js for Keypad interaction
  async tapNumberKey(digit) {
    console.log(`tapNumberKey called with digit: "${digit}"`);
    
    try {
      if (AppwrightSelectors.isAndroid(this._device)) {
        console.log(`Android: Looking for button with content-desc='${digit}'`);
        const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//android.widget.Button[@content-desc='${digit}']`)
        await appwrightExpect(numberKey).toBeVisible({ timeout: 30000 });
        await AppwrightGestures.tap(numberKey);
      }
      else {
        console.log(`iOS: Looking for button with name="${digit}"`);
        const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//XCUIElementTypeButton[@name="${digit}"]`);
        await appwrightExpect(numberKey).toBeVisible({ timeout: 30000 });
        await AppwrightGestures.tap(numberKey);
      }
    } catch (error) {
      console.error(`Error in tapNumberKey for digit "${digit}":`, error);
      throw error;
    }
  }

  async enterAmount(text) {
    // Since PerpsOrderView likely only supports keypad input for amount in the UI flow being tested
    const digits = splitAmountIntoDigits(text);
    for (const digit of digits) {
      console.log('Tapping digit:', digit);
      await this.tapNumberKey(digit);
    }
  }

  async setLeverage(leverage) {
    await AppwrightGestures.tap(this.leverageButton);
    await AppwrightGestures.tap(await this.leverageOption(leverage));
    await AppwrightGestures.tap(await this.confirmLeverageButton(leverage));    
  }
}

export default new PerpsOrderView();