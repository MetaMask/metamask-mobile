import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsTabView {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
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

  async tapPerpsTab() {
    const perpsAction = await AppwrightSelectors.getElementByID(this._device, 'wallet-perps-action');
    await perpsAction.tap();
  }
}

export default new PerpsTabView();


