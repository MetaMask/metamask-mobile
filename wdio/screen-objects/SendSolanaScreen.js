import AppwrightSelectors from '../helpers/AppwrightSelectors.js';
import { expect as appwrightExpect } from 'appwright';
import TimerHelper from '../../appwright/utils/TimersHelper.js';

class SendSolanaScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get addressField() {
    if (AppwrightSelectors.isAndroid(this._device)) {
      return AppwrightSelectors.getElementByID(this._device, 'send-to-snap-ui-input');
    }
    return AppwrightSelectors.getElementByXpath(this._device, '(//XCUIElementTypeOther[@name="textfield"])[1]');
  }

  get amountField() {
    if (AppwrightSelectors.isAndroid(this._device)) {
      return AppwrightSelectors.getElementByID(this._device, 'send-amount-input-snap-ui-input');
    }
    return AppwrightSelectors.getElementByXpath(this._device, '(//XCUIElementTypeOther[@name="textfield"])[2]');
  }

  get continueButton() {
    return AppwrightSelectors.getElementByID(this._device, 'send-submit-button-snap-footer-button');
  }

  get cancelButton() {
    return AppwrightSelectors.getElementByID(this._device, 'send-cancel-button-snap-footer-button');
  }

  async isAddressFieldVisible() {
    const element = await this.addressField;
    await appwrightExpect(element).toBeVisible();
  }

  async fillAddressField(address) {
    const element = await this.addressField;
    await element.fill(address);
  }

  async fillAmountField(amount) {
    const element = await this.amountField;
    await element.fill(amount);
    const continueButton = await this.continueButton;
    await appwrightExpect(continueButton).toBeVisible({ timeout: 10000 });  }

  async tapContinueButton() {
    await this._device.waitForTimeout(2000); // wait for the spinner to dissapear
    const continueButton = await this.continueButton;
    await appwrightExpect(continueButton).toBeVisible();
    const timer1 = new TimerHelper(
      'Time since the user is on the send amount screen until the user gets the confirmation screen',
    );
    timer1.start();
    await continueButton.tap();
    return timer1;
  }

  async tapCancelButton() {
    const element = await this.cancelButton;
    await element.tap();
  }
}

export default new SendSolanaScreen();
