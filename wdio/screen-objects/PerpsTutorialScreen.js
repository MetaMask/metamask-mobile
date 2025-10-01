import { expect } from 'appwright';
import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';

class PerpsTutorialScreen {

  set device(device) {
    this._device = device;

  }

  get addFundsButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-tutorial-continue-button');
  }

  get skipButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-tutorial-skip-button');
  }

  get title() {
    return AppwrightSelectors.getElementByCatchAll(this._device, 'What are perps?');
  }

  get continueButton() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-tutorial-continue-button');
  }

  get skipButtonTutorial() {
    return AppwrightSelectors.getElementByID(this._device, 'perps-tutorial-skip-button');
  }

  async tapAddFunds() {
    await AppwrightGestures.tap(this.addFundsButton); // Use static tap method with retry logic
  }

  async tapSkip() {
    await AppwrightGestures.tap(this.skipButtonTutorial); // Use static tap method with retry logic
  }

  async expectFirstScreenVisible() {
    const title = await this.title;
    expect(await title).toBeVisible({ timeout: 10000 });
  }

  async flowTapContinueTutorial(times = 1) {
    const btn = await this.addFundsButton;
    for (let i = 0; i < times; i++) {
      await AppwrightGestures.tap(btn); // Use static tap method with retry logic
    }
  }
}

export default new PerpsTutorialScreen();


