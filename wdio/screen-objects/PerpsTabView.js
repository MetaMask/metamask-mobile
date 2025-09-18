import AppwrightSelectors from '../helpers/AppwrightSelectors.js';
import AppwrightGestures from '../../appwright/utils/AppwrightGestures.js';

class PerpsTabView extends AppwrightGestures {
  constructor() {
    super();
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
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
    await this.tap(this.perpsTabButton); // Use inherited tap method with retry logic
  }

  async tapAddFunds() {
    await this.tap(this.addFundsButton); // Use inherited tap method with retry logic
  }

  async tapOnboardingButton() {
    const button = await this.onboardingButton;
    await button.isVisible({ timeout: 5000 });
    await this.tap(button); // Use inherited tap method with retry logic
  }
}

export default new PerpsTabView();


