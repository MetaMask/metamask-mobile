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

  get SolanaPopup() {
    return AppwrightSelectors.getElementByText(this._device, 'Use Solana on Uniswap');
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
}

export default new UniswapDapp();
