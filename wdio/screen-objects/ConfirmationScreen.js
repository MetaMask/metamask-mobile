import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import { ConfirmationRowComponentIDs,ConfirmationFooterSelectorIDs } from '../../app/components/Views/confirmations/ConfirmationView.testIds';
import { expect as appwrightExpect } from 'appwright';

class ConfirmationScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get accountSendTo() {
    return AppwrightSelectors.getElementByID(this._device, ConfirmationRowComponentIDs.FROM_TO);
  }

  get network() {
    return AppwrightSelectors.getElementByID(this._device, ConfirmationRowComponentIDs.GAS_FEES_DETAILS);
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

  async isVisible(network, timeout = 10000) {
    const titleElement = await AppwrightSelectors.getElementByCatchAll(this._device, network === 'Solana' ? 'Transaction request' : 'Review');
    await appwrightExpect(titleElement).toBeVisible({ timeout });
  }
}

export default new ConfirmationScreen();