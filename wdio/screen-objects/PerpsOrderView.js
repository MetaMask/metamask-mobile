import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import AmountScreen from './AmountScreen';
import { expect as appwrightExpect } from 'appwright';
import { splitAmountIntoDigits } from 'appwright/utils/Utils';
import PerpsPositionDetailsView from './PerpsPositionDetailsView';

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
    await AppwrightGestures.tap(await this.placeOrderButton);
    appwrightExpect(await PerpsPositionDetailsView.isPositionOpen()).toBe(true);
  }

  // Reuse logic from AmountScreen.js for Keypad interaction
  async tapNumberKey(digit) {
    AmountScreen.device = this._device;
    await AmountScreen.tapNumberKey(digit);
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
    await AppwrightGestures.tap(await this.leverageButton);
    await AppwrightGestures.tap(await this.leverageOption(leverage));
    await AppwrightGestures.tap(await this.confirmLeverageButton(leverage));    
  }
}

export default new PerpsOrderView();