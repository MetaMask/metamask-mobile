import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';

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
    await AppwrightGestures.tap(this.perpsTabButton); // Use static tap method with retry logic
  }

  async tapAddFunds() {
    await AppwrightGestures.tap(this.addFundsButton); // Use static tap method with retry logic
  }

  async tapOnboardingButton() {
    const button = await this.onboardingButton;
    await button.isVisible({ timeout: 5000 });
    await AppwrightGestures.tap(button); // Use static tap method with retry logic
  }
}

export default new PerpsTabView();


