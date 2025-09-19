import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsTutorialScreen {
  get device() {
    return this._device;
  }

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
    const btn = await this.addFundsButton;
    await btn.tap();
}

  async tapSkip() {
    const btn = await this.skipButtonTutorial;
    await btn.tap();
  }

  async expectFirstScreenVisible() {
    const title = await this.title;
    await title.isVisible({ timeout: 10000 });
  }

  async flowTapContinueTutorial(times = 1) {
    const btn = await this.addFundsButton;
    for (let i = 0; i < times; i++) {
      await btn.tap();
    }
  }
}

export default new PerpsTutorialScreen();


