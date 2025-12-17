import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';

class PerpsTabView {

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;

  }

  get perpsTabButton() {
    return AppwrightSelectors.getElementByID(this._device, 'undefined-tab-1');
  }

  get addFundsButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-add-funds-button');
  }

  get onboardingButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-start-trading-button');
  }

  get startTradingButton() {
    return AppwrightSelectors.getElementByText(this._device, 'Start trading');
  }

  async tapPerpsTab() {
    await AppwrightGestures.tap(await this.perpsTabButton); // Use static tap method with retry logic
  }

  async tapStartTradingButton() {
    await AppwrightGestures.tap(await this.startTradingButton); // Use static tap method with retry logic
  }

  async tapAddFunds() {
    await AppwrightGestures.tap(await this.addFundsButton); // Use static tap method with retry logic
  }

  async tapOnboardingButton() {
    const button = await this.onboardingButton;
    await appwrightExpect(button).toBeVisible({ timeout: 5000 });
    await AppwrightGestures.tap(button); // Use static tap method with retry logic
  }
}

export default new PerpsTabView();


