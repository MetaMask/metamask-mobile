import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsTabView {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  async getPerpsTabButton() {
    return await AppwrightSelectors.getElementByID(this._device, 'wallet-perps-action');
  }

  async tapPerpsTab() {
    const btn = await this.getPerpsTabButton();
    await btn.tap();
  }

  async tapAddFunds() {
    const btn = await AppwrightSelectors.getElementByID(this._device, 'perps-add-funds-button');
    await btn.tap();
  }

  async tapOnboardingButton() {
    const button = await AppwrightSelectors.getElementByID(this._device, 'perps-start-trading-button');
    await button.isVisible({ timeout: 5000 });
    await button.tap();
  }
}

export default new PerpsTabView();


