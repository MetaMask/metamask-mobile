import AppwrightSelectors from '../helpers/AppwrightSelectors.js';
import AppwrightGestures from '../../appwright/utils/AppwrightGestures.js';

class PerpsTutorialScreen extends AppwrightGestures {
  constructor() {
    super();
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
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
    await this.tap(this.addFundsButton); // Use inherited tap method with retry logic
  }

  async tapSkip() {
    await this.tap(this.skipButtonTutorial); // Use inherited tap method with retry logic
  }

  async expectFirstScreenVisible() {
    const title = await this.title;
    await title.isVisible({ timeout: 10000 });
  }

  async flowTapContinueTutorial(times = 1) {
    const btn = await this.addFundsButton;
    for (let i = 0; i < times; i++) {
      await this.tap(btn); // Use inherited tap method with retry logic
    }
  }
}

export default new PerpsTutorialScreen();


