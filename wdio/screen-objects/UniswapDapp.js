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
    return this._getByTestId('navbar-connect-wallet');
  }

  get walletConnect() {
    return this._getByTextContains('WalletConnect');
  }

  get skipSolanaButton() {
    return this._getByText('Skip');
  }

  get metaMaskWalletOption() {
    return AppwrightSelectors.getElementByXpath(
      this._device,
      '//android.widget.Button[@text="MetaMask MetaMask"]',
    );
  }

  get metaMaskDeeplinkButton() {
    return AppwrightSelectors.getElementByXpath(
      this._device,
      '//android.widget.TextView[@text="MetaMask"]',
    );
  }

  get uniswapIcon() {
    return AppwrightSelectors.getElementByXpath(
      this._device,
      '//android.app.AlertDialog',
    );
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

  async tapOnMetaMaskWalletOption() {
    if (!this._device) return;
    const element = await this.metaMaskWalletOption;
    await AppwrightGestures.tap(element);

    const deeplinkButton = await this.metaMaskDeeplinkButton;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await AppwrightGestures.tap(deeplinkButton);
  }

  async isUniswapDisplayed(timeoutMs = 30000) {
    if (!this._device) return;
    const element = await this.uniswapIcon;
    await expect(element).toBeVisible({ timeout: timeoutMs });
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
