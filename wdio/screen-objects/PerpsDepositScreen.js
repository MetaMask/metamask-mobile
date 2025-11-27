import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';

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
    await AppwrightGestures.tap(networkButton); // Use static tap method with retry logic
  }

  async fillUsdAmount(amount) {
    await AppwrightGestures.typeText(this.amountInput, String(amount));
  }

  async tapPayWith() {
    const element = await this.payWithButton;
    await AppwrightGestures.tap(element); // Use static tap method with retry logic
  }

  async tapContinue() {
    const element = await this.continueButton;
    await AppwrightGestures.tap(element); // Use static tap method with retry logic
  }

  async tapCancel() {
    const element = await this.cancelButton;
    await AppwrightGestures.tap(element); // Use static tap method with retry logic
  }
}

export default new PerpsDepositScreen();


