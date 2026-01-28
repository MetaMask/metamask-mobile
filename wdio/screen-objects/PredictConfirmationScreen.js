import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';

class PredictConfirmationScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get confirmButton() {
    return AppwrightSelectors.getElementByCatchAll(
      this._device,
      'Confirm',
    );
  }

  get cancelButton() {
    return AppwrightSelectors.getElementByCatchAll(
      this._device,
      'Cancel',
    );
  }

  get depositAmountLabel() {
    return AppwrightSelectors.getElementByCatchAll(
      this._device,
      'Amount',
    );
  }

  get feesLabel() {
    return AppwrightSelectors.getElementByCatchAll(
      this._device,
      'fee',
    );
  }

  async isVisible() {
    const confirmButton = await this.confirmButton;
    await appwrightExpect(confirmButton).toBeVisible();
  }

  async isMetaMaskFeeDisplayed() {
    const metaMaskFeeElement = await AppwrightSelectors.getElementByID(
      this._device,
      'metamask-fee-row',
    );
    await appwrightExpect(metaMaskFeeElement).toBeVisible();
    const text = await metaMaskFeeElement.getText();
    await appwrightExpect(text).toContain('MetaMask fee');
  }

  async verifyDepositAmount(amount) {
    const amountText = await AppwrightSelectors.getElementByCatchAll(
      this._device,
      `$${amount}`,
    );
    await appwrightExpect(amountText).toBeVisible();
  }

  async verifyFeesDisplayed() {
    const feesLabel = await this.feesLabel;
    await appwrightExpect(feesLabel).toBeVisible();
  }

  async tapConfirm() {
    await AppwrightGestures.tap(await this.confirmButton);
  }

  async tapCancel() {
    await AppwrightGestures.tap(await this.cancelButton);
  }
}

export default new PredictConfirmationScreen();
