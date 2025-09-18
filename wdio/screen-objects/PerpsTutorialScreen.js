import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsTutorialScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
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

  async tapContinueTutorial(times = 1) {
    const btn = await AppwrightSelectors.getElementByID(this._device, 'perps-tutorial-continue-button');
    for (let i = 0; i < times; i++) {
      await btn.tap();
    }
  }

  async tapAddFunds() {
    // In the last slide, the Continue button label changes to "Add funds" but testID remains the same
    let btn;
    try {
      btn = await AppwrightSelectors.getElementByID(
        this._device,
        'perps-tutorial-continue-button',
      );
    } catch {}
    if (!btn) {
      btn = await AppwrightSelectors.getElementByCatchAll(
        this._device,
        'Add funds',
      );
    }
    await btn.tap();
  }
}

export default new PerpsTutorialScreen();


