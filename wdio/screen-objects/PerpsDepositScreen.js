import AppwrightSelectors from '../helpers/AppwrightSelectors.js';
import AppwrightGestures from '../../appwright/utils/AppwrightGestures.js';

class PerpsDepositScreen extends AppwrightGestures {
  constructor() {
    super();
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
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
    await this.tap(networkButton); // Use inherited tap method with retry logic
  }

  async fillUsdAmount(amount) {
    await this.typeText(this.amountInput, String(amount)); // Use inherited typeText method with retry logic
  }

  async tapPayWith() {
    await this.tap(this.payWithButton); // Use inherited tap method with retry logic
  }

  async tapContinue() {
    await this.tap(this.continueButton); // Use inherited tap method with retry logic
  }

  async tapCancel() {
    await this.tap(this.cancelButton); // Use inherited tap method with retry logic
  }
}

export default new PerpsDepositScreen();


