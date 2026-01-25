import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import AmountScreen from './AmountScreen';
import { expect as appwrightExpect } from 'appwright';

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

  get backButton() {
    return AppwrightSelectors.getElementByID(this._device, 'Add funds-navbar-back-button');
  }

  get payWithButton() {
    return AppwrightSelectors.getElementByCatchAll(
      this._device,
      'Pay with',
    );
  }

  get addFundsButton() {
    return AppwrightSelectors.getElementByText(this._device, 'Add funds');
  }

  get totalText() {
    return AppwrightSelectors.getElementByText(this._device, 'Total');
  }

  async isAmountInputVisible() {
    const input = await this.amountInput;
    await appwrightExpect(input).toBeVisible();
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
    await AppwrightGestures.tap(await this.payWithButton); // Use static tap method with retry logic
  }

  async tapContinue() {
    await AppwrightGestures.tap(await this.continueButton); // Use static tap method with retry logic
  }

  async tapCancel() {
    await AppwrightGestures.tap(await this.cancelButton); // Use static tap method with retry logic
  }

  async tapBackButton() {
    await AppwrightGestures.tap(await this.backButton); // Use static tap method with retry logic
  }

  async checkTransactionFeeIsVisible() {
    const transactionFee = await AppwrightSelectors.getElementByID(this._device, 'bridge-fee-row');
    await appwrightExpect(transactionFee).toBeVisible();
  }

  async isAddFundsVisible() {
    const addFunds = await this.addFundsButton;
    await appwrightExpect(addFunds).toBeVisible();
  }

  async isTotalVisible() {
    const total = await AppwrightSelectors.getElementByText(this._device, 'Total');
    await appwrightExpect(total).toBeVisible();
  }
}

export default new PerpsDepositScreen();


