import AppwrightSelectors from '../helpers/AppwrightSelectors';
import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import {
  AMOUNT_ERROR,
  AMOUNT_SCREEN,
  NEXT_BUTTON,
  TRANSACTION_AMOUNT_INPUT,
} from './testIDs/Screens/AmountScreen.testIds';
import { expect as appwrightExpect } from 'appwright';

class ConfirmationScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get accountSendTo() {
    return AppwrightSelectors.getElementByID(this._device, 'from-to');
  }

  get network() {
    return AppwrightSelectors.getElementByID(this._device, 'gas-fees-details');
  }

  get advancedSettings() {
    return AppwrightSelectors.getElementByID(this._device, 'info-section');
  }

  get confirmButton() {
    return AppwrightSelectors.getElementByID(this._device, 'confirm-button');
  }

  async isAccountSendToVisible() {
    const accountSendTo = await this.accountSendTo;
    await appwrightExpect(accountSendTo).toBeVisible();
  }

  async isNetworkDisplayed() {
    const network = await this.network;
    await appwrightExpect(network).toBeVisible();
  }

  async isAdvancedSettingsDisplayed() {
    const advancedSettings = await this.advancedSettings;
    await appwrightExpect(advancedSettings).toBeVisible();
  }

  async isConfirmButtonClickable() {
    const confirmButton = await this.confirmButton;
    await AppwrightSelectors.isElementClickable(confirmButton);
  }

  async tapOnConfirmButton() {
    const confirmButton = await this.confirmButton;
    console.log('confirmButton', confirmButton);
    //await confirmButton.tap();
  }
}

export default new ConfirmationScreen();
