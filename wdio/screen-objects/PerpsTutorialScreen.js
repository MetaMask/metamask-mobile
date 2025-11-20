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
    return this.continueButton;
  }

  get skipButtonTutorial() {
    return this.skipButton;
  }

  async tapContinue() {
    await AppwrightGestures.tap(this.continueButton); // Use static tap method with retry logic
  }

  // Legacy alias for backward compatibility
  async tapAddFunds() {
    await this.tapContinue();
  }

  async tapSkip() {
    await AppwrightGestures.tap(this.skipButton); // Use static tap method with retry logic
  }

  async expectFirstScreenVisible() {
    const title = await this.title;
    expect(await title).toBeVisible();
  }

  async flowTapContinueTutorial(times = 1) {
    const btn = await this.continueButton;
    for (let i = 0; i < times; i++) {
      await AppwrightGestures.tap(btn); // Use static tap method with retry logic
    }
  }
}

export default new PerpsTutorialScreen();
