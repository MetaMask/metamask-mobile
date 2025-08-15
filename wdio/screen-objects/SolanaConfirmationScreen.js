import AppwrightSelectors from '../helpers/AppwrightSelectors';
import { expect as appwrightExpect } from 'appwright';

class SolanaConfirmationScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get field() {
    return AppwrightSelectors.getElementByID(this._device, 'snap-ui-info-row');
  }

  get confirmButton() {
    return AppwrightSelectors.getElementByID(this._device, 'transaction-confirmation-submit-button-snap-footer-button');
  }

  async isFieldVisible() {
    const field = await this.field;
    await appwrightExpect(field).toBeVisible();
  }

  async isConfirmButtonDisplayed() {
    const confirmButton = await this.confirmButton;
    await appwrightExpect(confirmButton).toBeVisible();
  }
}

export default new SolanaConfirmationScreen();
