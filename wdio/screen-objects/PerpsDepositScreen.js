import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsDepositScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  async isAmountInputVisible() {
    const input = await AppwrightSelectors.getElementByID(this._device, 'edit-amount-input');
    await input.isVisible({ timeout: 15000 });
  }

  async hideKeyboardIfOpen() {
    try {
      await AppwrightSelectors.hideKeyboard(this._device);
      if (this._device?.waitForTimeout) {
        await this._device.waitForTimeout(300);
      }
    } catch {}
  }

  async openPayWith() {
    const rowLabel = await AppwrightSelectors.getElementByCatchAll(
      this._device,
      'Pay with',
    );
    await this.hideKeyboardIfOpen();
    try {
      await AppwrightSelectors.scrollIntoView(this._device, rowLabel);
    } catch {}
    await rowLabel.tap();
  }

  async selectPayTokenByText(networkId, token) {
    const networkButton = await AppwrightSelectors.getElementByID(this._device, `asset-${networkId}-${token}`);
    await networkButton.tap();
  }


  async fillUsdAmount(amount) {
    const input = await AppwrightSelectors.getElementByID(this._device, 'edit-amount-input');
    await input.fill(String(amount));
  }

  async tapContinue() {
    const done = await AppwrightSelectors.getElementByID(this._device, 'deposit-keyboard-done-button');
    await done.tap();

  }

  async tapCancel() {
    const confirmButton = await AppwrightSelectors.getElementByID(this._device, 'confirm-button');
    await confirmButton.isEnabled({ timeout: 5000 });
    const cancel = await AppwrightSelectors.getElementByID(this._device, 'cancel-button');
    await cancel.tap();
  }
}

export default new PerpsDepositScreen();


