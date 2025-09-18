import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsDepositScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  async getContinueButton() {
    return await AppwrightSelectors.getElementByID(this._device, 'deposit-keyboard-done-button')
  }

  get cancelButton() {
    return AppwrightSelectors.getElementByID(this._device, 'cancel-button');
  }

  async getPayWithButton() {
    return await AppwrightSelectors.getElementByCatchAll(
      this._device,
      'Pay with',
    );
  }

  async isAmountInputVisible() {
    const input = await AppwrightSelectors.getElementByID(this._device, 'edit-amount-input');
    await input.isVisible({ timeout: 15000 });
  }

  async selectPayTokenByText(networkId, token) {
    const networkButton = await AppwrightSelectors.getElementByID(this._device, `asset-${networkId}-${token}`);
    await networkButton.tap();
  }


  async fillUsdAmount(amount) {
    const input = await AppwrightSelectors.getElementByID(this._device, 'edit-amount-input');
    await input.fill(String(amount));
  }

  async tapPayWith() {
    const btn = await this.getPayWithButton();
    await btn.tap();
  }

  async tapContinue() {
    const btn = await this.getContinueButton();
    await btn.tap();
  }

  async tapCancel() {
    const btn = await this.cancelButton;
    await btn.tap();
  }
}

export default new PerpsDepositScreen();


