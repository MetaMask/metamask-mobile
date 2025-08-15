import Gestures from '../helpers/Gestures.js';
import Selectors from '../helpers/Selectors.js';
import {
  ADD_ADDRESS_BUTTON,
  AMOUNT_SCREEN,
  SEND_ADDRESS_INPUT_FIELD,
  SEND_CANCEL_BUTTON,
  SEND_SCREEN_ID,
  SEND_WARNING_MESSAGE,
  UNDERSTAND_WARNING_CONTINUE,
} from './testIDs/Screens/SendScreen.testIds.js';
import { TRANSACTION_AMOUNT_INPUT } from './testIDs/Screens/AmountScreen.testIds.js';
import AppwrightSelectors from '../helpers/AppwrightSelectors.js';
import { SendViewSelectorsIDs } from '../../e2e/selectors/SendFlow/SendView.selectors.js';
import { expect as appwrightExpect } from 'appwright';

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
  }

  async tapContinueButton() {
    const element = await this.continueButton;
    await element.tap();
  }

  async tapCancelButton() {
    const element = await this.cancelButton;
    await element.tap();
  }
}

export default new SendSolanaScreen();
