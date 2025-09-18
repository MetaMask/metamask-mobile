import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsTabView {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get perpsTabButton() {
    return AppwrightSelectors.getElementByID(this._device, 'wallet-perps-action');
  }

  get addFundsButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-add-funds-button');
  }

  get onboardingButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-start-trading-button');
  }

  async tapPerpsTab() {
    const btn = await this.perpsTabButton;
    await btn.tap();
  }

  async tapAddFunds() {
    const btn = await this.addFundsButton;
    await btn.tap();
  }

  async tapOnboardingButton() {
    const button = await this.onboardingButton;
    await button.isVisible({ timeout: 5000 });
    await button.tap();
  }
}

export default new PerpsTabView();


