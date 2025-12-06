import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import AmountScreen from './AmountScreen';
import { expect } from 'appwright';

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
    return AppwrightSelectors.getElementByID(this._device, 'custom-amount-input');
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

  async selectPayTokenByText(token) {
    const tokenButton = await AppwrightSelectors.getElementByCatchAll(this._device, token);
    await AppwrightGestures.tap(tokenButton); // Use static tap method with retry logic
  }

  async fillUsdAmount(amount) {
    AmountScreen.device = this._device;
    await AmountScreen.enterAmount(amount);
    await AmountScreen.tapOnNextButton();
  }

  async tapPayWith() {
    await AppwrightGestures.tap(this.payWithButton); // Use static tap method with retry logic
  }

  async tapContinue() {
    await AppwrightGestures.tap(this.continueButton); // Use static tap method with retry logic
  }

  async tapCancel() {
    await AppwrightGestures.tap(this.cancelButton); // Use static tap method with retry logic
  }

  async checkTransactionFeeIsVisible() {
    const transactionFee = await AppwrightSelectors.getElementByID(this._device, 'bridge-fee-row');
    await expect(transactionFee).toBeVisible();
  }
}

export default new PerpsDepositScreen();


