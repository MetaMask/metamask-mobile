import AppwrightSelectors from '../../e2e/framework/AppwrightSelectors';
import AppwrightGestures from '../../e2e/framework/AppwrightGestures';
import { expect as appwrightExpect } from 'appwright';

class PredictDepositScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  get continueButton() {
    return AppwrightSelectors.getElementByID(
      this._device,
      'deposit-keyboard-done-button',
    );
  }

  get cancelButton() {
    return AppwrightSelectors.getElementByID(this._device, 'cancel-button');
  }

  get amountInput() {
    return AppwrightSelectors.getElementByID(
      this._device,
      'custom-amount-input',
    );
  }

  get payWithButton() {
    return AppwrightSelectors.getElementByCatchAll(this._device, 'Pay with');
  }

  async isAmountInputVisible() {
    const input = await this.amountInput;
    await input.isVisible({ timeout: 15000 });
  }

  async isSelectPaymentVisible() {
    const selectPaymentButton = await AppwrightSelectors.getElementByCatchAll(
      this._device,
      'Select payment method',
    );
    await selectPaymentButton.isVisible({ timeout: 15000 });
  }

  async selectPayTokenByText(networkId, token) {
    const networkButton = await AppwrightSelectors.getElementByID(
      this._device,
      `asset-${networkId}-${token}`,
    );
    await AppwrightGestures.tap(networkButton);
  }

  async searchToken(tokenName) {
    let searchField;
    if (AppwrightSelectors.isIOS(this._device)) {
      // iOS: Use placeholder text to find the search field
      searchField = await AppwrightSelectors.getElementByCatchAll(
        this._device,
        'Search token',
      );
    } else {
      // Android: Use testID
      searchField = await AppwrightSelectors.getElementByID(
        this._device,
        'textfieldsearch',
      );
    }
    await searchField.fill(tokenName);
  }

  async tapEthereumFilter() {
    // Dismiss keyboard before tapping filter
    await AppwrightGestures.hideKeyboard(this._device);
    const ethereumFilter = await AppwrightSelectors.getElementByCatchAll(
      this._device,
      'Ethereum',
    );
    // Wait for keyboard to be fully dismissed and element to be visible
    await appwrightExpect(ethereumFilter).toBeVisible({ timeout: 15000 });
    if (AppwrightSelectors.isIOS(this._device)) {
      // iOS: Use double tap for more reliable interaction
      await ethereumFilter.tap();
      await ethereumFilter.tap();
    } else {
      await ethereumFilter.tap();
    }
  }

  async tapFirstUsdc(tokenName) {
    const usdcElement = await AppwrightSelectors.getElementByText(
      this._device,
      tokenName,
    );
    await AppwrightGestures.tap(usdcElement);
  }

  async fillUsdAmount(amount) {
    // Tap on the amount display to activate it
    await AppwrightGestures.tap(await this.amountInput);

    // Type the amount using the keypad with platform-specific selectors
    const amountString = String(amount);
    for (const digit of amountString) {
      if (AppwrightSelectors.isAndroid(this._device)) {
        // Android: Use content-desc for number buttons, text for decimal point
        const xpath =
          digit === '.'
            ? `//android.view.View[@text="."]`
            : `//android.widget.Button[@content-desc='${digit}']`;
        const keypadButton = await AppwrightSelectors.getElementByXpath(
          this._device,
          xpath,
        );
        await appwrightExpect(keypadButton).toBeVisible({ timeout: 15000 });
        await AppwrightGestures.tap(keypadButton);
      } else {
        // iOS: Use XCUIElementTypeButton with name attribute
        const keypadButton = await AppwrightSelectors.getElementByXpath(
          this._device,
          `//XCUIElementTypeButton[@name="${digit}"]`,
        );
        await appwrightExpect(keypadButton).toBeVisible({ timeout: 15000 });
        await AppwrightGestures.tap(keypadButton);
      }
    }
  }

  async tapPayWith() {
    await AppwrightGestures.tap(await this.payWithButton);
  }

  async tapContinue() {
    await AppwrightGestures.tap(await this.continueButton);
  }

  async tapCancel() {
    await AppwrightGestures.tap(await this.cancelButton);
  }
}

export default new PredictDepositScreen();


