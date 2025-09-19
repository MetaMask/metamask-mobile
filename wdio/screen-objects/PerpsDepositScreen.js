import AppwrightSelectors from '../helpers/AppwrightSelectors.js';

class PerpsDepositScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get continueButton() {
    return AppwrightSelectors.getElementByID(this._device, 'deposit-keyboard-done-button')
  }

  get cancelButton() {
    return AppwrightSelectors.getElementByID(this._device, 'cancel-button');
  }

  get amountInput() {
    return AppwrightSelectors.getElementByID(this._device, 'edit-amount-input');
  }

  get payWithButton() {
    return AppwrightSelectors.getElementByCatchAll(
      this._device,
      'Pay with',
    );
  }

  async isAmountInputVisible() {
    const input = await this.amountInput;
    await input.isVisible({ timeout: 15000 });
  }

  async selectPayTokenByText(networkId, token) {
    const networkButton = await AppwrightSelectors.getElementByID(this._device, `asset-${networkId}-${token}`);
    await networkButton.tap();
  }

  async fillUsdAmount(amount) {
    const input = await this.amountInput;
    await input.fill(String(amount));
  }

  async tapPayWith() {
    const btn = await this.payWithButton;
    await btn.tap();
  }

  async tapContinue() {
    const btn = await this.continueButton;
    await btn.tap();
  }

  async tapCancel() {
    const btn = await this.cancelButton;
    await btn.tap();
  }
}

export default new PerpsDepositScreen();


