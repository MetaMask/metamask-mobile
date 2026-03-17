import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { expect } from 'appwright';

/**
 * Page Object for Uniswap (https://app.uniswap.org)
 *
 * Used in web context (Chrome/Safari) via AppwrightHelpers.withWebAction().
 * Selectors rely on visible text since Uniswap does not expose stable data-testid attributes.
 */
class UniswapDapp {
  constructor() {
    this._device = null;
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  _getByText(text) {
    if (!this._device) return null;
    return AppwrightSelectors.getElementByText(this._device, text, false);
  }

  _getByTextContains(text) {
    if (!this._device) return null;
    return AppwrightSelectors.getElementByXpath(
      this._device,
      `//*[contains(normalize-space(.), "${text}")]`,
    );
  }

  _getByTestId(testId) {
    if (!this._device) return null;
    return AppwrightSelectors.getElementByXpath(
      this._device,
      `//*[@data-testid="${testId}"]`,
    );
  }

  // ============================================================
  // SELECTORS
  // ============================================================

  get connectButton() {
    if (AppwrightSelectors.isAndroid(this._device)) {
      return this._getByTestId('navbar-connect-wallet');
    } else 
      return AppwrightSelectors.getElementByNameiOS(this._device, 'Connect');
  }

  get walletConnect() {
    if (AppwrightSelectors.isAndroid(this._device)) {
      return this._getByTextContains('WalletConnect');
    } else {
      return AppwrightSelectors.getElementByXpath(this._device, '//XCUIElementTypeStaticText[@name="WalletConnect"]');
    }
  }

  get skipSolanaButton() {
    return this._getByText('Skip');
  }

  get metaMaskWalletOption() {
    if (AppwrightSelectors.isAndroid(this._device)) {
      return AppwrightSelectors.getElementByXpath(
        this._device,
        '//android.widget.Button[@text="MetaMask MetaMask"]',
      );
    } else {
      return AppwrightSelectors.getElementByXpath(this._device, '//XCUIElementTypeButton[@name="MetaMask MetaMask"]');
    }
  }

  get metaMaskDeeplinkButton() {
    if (AppwrightSelectors.isAndroid(this._device)) {
      return AppwrightSelectors.getElementByXpath(
        this._device,
        '//android.widget.TextView[@text="MetaMask"]',
      );
    } else {
      return AppwrightSelectors.getElementByXpath(this._device, '//XCUIElementTypeOther[@name="textfield"]');
    }
  }

  get uniswapDialog() {
    return AppwrightSelectors.getElementByXpath(
      this._device,
      '//android.app.AlertDialog',
    );
  }

  get uniswapIcon() {
    return AppwrightSelectors.getElementByID(this._device, 'account-icon');
  }

  get uniswapDialogCloseButton() {
    return AppwrightSelectors.getElementByXpath(
      this._device,
      '//android.app.AlertDialog//*[@resource-id="android:id/button2" or @resource-id="android:id/button1" or @text="Cancel" or @text="Close" or @content-desc="Close"]',
    );
  }

  get SolanaPopup() {
    return AppwrightSelectors.getElementByText(this._device, 'Use Solana on Uniswap');
  }
  

  getAmountInput() {
    if (!this._device) {
        return null;
    }

    return AppwrightSelectors.getElementByXpath(this._device, '//*[contains(@text, "Sell 0")]');

  }

  getSelectDestinationTokenButton() {
      if (!this._device) {
          return null;
      }

      return AppwrightSelectors.getElementByID(this._device, 'choose-output-token-label');
  }

  getTokenByText(tokenText) {
      if (!this._device) {
          return null;
      }

      if (AppwrightSelectors.isAndroid(this._device)) {
          return AppwrightSelectors.getElementByText(this._device, tokenText);
      }
  }

  getReviewButton() {
      if (!this._device) {
          return null;
      }

      if (AppwrightSelectors.isAndroid(this._device)) {
          return AppwrightSelectors.getElementByID(this._device, 'review-swap');
      }
  }

  getConfirmLowBalanceButton() {
      if (!this._device) {
          return null;
      }

      if (AppwrightSelectors.isAndroid(this._device)) {
          return AppwrightSelectors.getElementByID(this._device, 'review-swap');
      }
  }

    async getSwapButton() {
      if (!this._device) {
          return null;
      }

      if (AppwrightSelectors.isAndroid(this._device)) {
          return AppwrightSelectors.getElementByID(this._device, 'swap');
      }
    }


    async tapSwapButton() {
      if (!this._device) {
          return;
      }

      const element = await this.getSwapButton();
      await AppwrightGestures.tap(element)
  }

  async tapConfirmLowBalanceButton() {
      if (!this._device) {
          return;
      }

      const element = await this.getConfirmLowBalanceButton();
      await AppwrightGestures.tap(element)
  }

  async tapReviewButton() {
      if (!this._device) {
          return;
      }

      const element = await this.getReviewButton();
      await AppwrightGestures.tap(element)
  }

  async tapSelectDestinationTokenButton() {
      if (!this._device) {
          return;
      }

      const element = await this.getSelectDestinationTokenButton();
      await AppwrightGestures.tap(element)
  }

  async tapTokenByText(tokenText) {
      if (!this._device) {
          return;
      }

      const element = await this.getTokenByText(tokenText);
      await AppwrightGestures.tap(element)
  }

  async tapAmountInput(amount) {
      if (!this._device) {
          return;
      }

      const element = await this.getAmountInput();
      await AppwrightGestures.tap(element)
  }

  async enterAmount(amount) {
      if (!this._device) {
          return;
      }

      await this._device.pause();
      const element = await this.getAmountInput();
      await AppwrightGestures.tap(element);
      await AppwrightGestures.typeText(element, amount)
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  async waitForConnectButtonVisible(timeoutMs = 20000) {
    if (!this._device) return;
    const element = await this.connectButton;
    await expect(element).toBeVisible({ timeout: timeoutMs });
  }

  async waitForWalletConnectVisible(timeoutMs = 15000) {
    if (!this._device) return;
    const element = await this.walletConnect;
    await expect(element).toBeVisible({ timeout: timeoutMs });
  }

  async tapConnect() {
    if (!this._device) return;
    const element = await this.connectButton;
    await AppwrightGestures.tap(element);
  }

  async tapOnWalletConnect() {
    if (!this._device) return;
    const element = await this.walletConnect;
    await AppwrightGestures.tap(element);
  }

  async tapSkipSolana() {
    if (!this._device) return;
    const element = await this.skipSolanaButton;
    await AppwrightGestures.tap(element);
  }

  async connectWithMetaMask() {
    if (!this._device) return;
    await this.waitForConnectButtonVisible();
    await this.tapConnect();
    await this.waitForWalletConnectVisible();
    await this.tapOnWalletConnect();
  }


  async connectIOS(timeoutMs = 20000) {
    if (!this._device) return;
    await this.waitForConnectButtonVisible(timeoutMs);
    await this.tapConnect();
  }

  async selectWalletConnectOption() {
    if (!this._device) return;
    const element = await this.walletConnect;
    await AppwrightGestures.tap(element);
  }

  async tapOnMetaMaskWalletOption() {
    if (!this._device) return;
    const element = await this.metaMaskWalletOption;
    await AppwrightGestures.tap(element);
  }

  async tapOnMetaMaskDeeplinkButton() {
    if (!this._device) return;
    const deeplinkButton = await this.metaMaskDeeplinkButton;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('tapping on deeplink button');
    await AppwrightGestures.tap(deeplinkButton);
  }

  // Backward-compatible helper used by existing flows.
  async tapOnMetaMaskWalletOptionAndOpenDeeplink() {
    if (!this._device) return;
    await this.tapOnMetaMaskWalletOption();
    await this.tapOnMetaMaskDeeplinkButton();
  }

  async isUniswapDisplayed(timeoutMs = 30000) {
    if (!this._device) return;
    if (AppwrightSelectors.isAndroid(this._device)) {
      const element = await this.uniswapDialog;
      const icon = await this.uniswapIcon;
      const dialogVisible = await element
        .isVisible({ timeout: timeoutMs })
        .catch(() => false);
      if (dialogVisible) {
        return;
      }

      const iconVisible = await icon.isVisible({ timeout: timeoutMs }).catch(() => false);
      if (!iconVisible) {
        throw new Error(
          'Neither Uniswap dialog nor account icon is visible in Android context',
        );
      }
    } else {
      const element = await this.SolanaPopup;
      await expect(element).toBeVisible({ timeout: timeoutMs });
    }
  }

  async closeUniswapDialog() {
    if (!this._device) return;

    // Preferred path: tap just above/left of the bottom sheet area.
    // This avoids the status bar and targets the dimmed backdrop.
    try {
      await this._device.tap({ x: 24, y: 250 });
      return;
    } catch {
      // Try a second nearby backdrop point.
    }

    try {
      await this._device.tap({ x: 24, y: 200 });
      return;
    } catch {
      // Fall through to explicit button fallback.
    }

    // Fallback: use explicit close/cancel button if present.
    try {
      const closeButton = await this.uniswapDialogCloseButton;
      await AppwrightGestures.tap(closeButton);
      return;
    } catch {
      // Nothing else to do.
    }
  }

  // ============================================================
  // ASSERTIONS
  // ============================================================

  /**
   * Assert the "Use Solana" popup is visible by checking for the Skip button.
   * Uniswap shows this popup immediately after a successful wallet connection.
   * @param {number} timeoutMs - Max time to wait (default 30s for cross-context flow)
   */
  async assertSolanaPopupVisible(timeoutMs = 30000) {
    if (!this._device) return;
    const skipButton = await this.skipSolanaButton;
    await expect(skipButton).toBeVisible({ timeout: timeoutMs });
  }
}

export default new UniswapDapp();
