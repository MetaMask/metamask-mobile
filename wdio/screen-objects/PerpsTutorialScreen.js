import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsTutorialScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  async getAddFundsButton() {
    return await AppwrightSelectors.getElementByID(
      this._device,
      'perps-tutorial-continue-button',
    );
  }

  async tapAddFunds() {
    const btn = await this.getAddFundsButton();
    await btn.tap();
}

  async tapSkip() {
    const btn = await AppwrightSelectors.getElementByID(this._device, 'perps-tutorial-skip-button');
    await btn.tap();
  }

  async expectFirstScreenVisible() {
    const title = await AppwrightSelectors.getElementByCatchAll(
      this._device,
      'What are perps?',
    );
    await title.isVisible({ timeout: 10000 });
  }

  async flowTapContinueTutorial(times = 1) {
    const btn = await AppwrightSelectors.getElementByID(this._device, 'perps-tutorial-continue-button');
    for (let i = 0; i < times; i++) {
      await btn.tap();
    }
  }
}

export default new PerpsTutorialScreen();


