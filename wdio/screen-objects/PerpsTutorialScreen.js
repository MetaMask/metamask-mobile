import { expect } from 'appwright';
import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';

class PerpsTutorialScreen {

  set device(device) {
    this._device = device;

  }

  get continueButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-tutorial-continue-button');
  }

  get skipButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-tutorial-skip-button');
  }

  get title() {
    return AppwrightSelectors.getElementByCatchAll(this._device, 'What are perps?');
  }

  // Legacy alias for backward compatibility
  get addFundsButton() {
    return AppwrightSelectors.getElementByCatchAll(this._device, 'Add funds');
  }

  get skipButtonTutorial() {
    return this.skipButton;
  }

  async tapContinue() {
    await AppwrightGestures.tap(await this.continueButton);
  }

  // Legacy alias for backward compatibility
  async tapAddFunds() {
    await AppwrightGestures.tap(await this.addFundsButton); 
  }

  async tapSkip() {
    await AppwrightGestures.tap(await this.skipButton);
  }

  async expectFirstScreenVisible() {
    const title = await this.title;
    expect(await title).toBeVisible();
  }

  async flowTapContinueTutorial(times = 1) {
    for (let i = 0; i < times; i++) {
      await AppwrightGestures.tap(await this.continueButton);
    }
  }
}

export default new PerpsTutorialScreen();
