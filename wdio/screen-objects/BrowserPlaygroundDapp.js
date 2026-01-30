import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { expect } from 'appwright';

/**
 * Page Object for @metamask/browser-playground test dapp
 *
 * This page object uses data-testid selectors from @metamask/playground-ui.
 * The test IDs follow the pattern defined in playground-ui/src/testIds/index.ts
 *
 * Note: Browser Playground uses data-testid attributes, not id attributes.
 * XPath selectors must use: //*[@data-testid="..."]
 */
class BrowserPlaygroundDapp {
  constructor() {
    this._device = null;
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  // ============================================================
  // HELPER: Get element by data-testid
  // ============================================================

  /**
   * Helper to create XPath selector for data-testid attribute
   * @param {string} testId - The data-testid value
   * @returns {Promise<import('appwright').AppwrightLocator>} - Element locator
   */
  _getByTestId(testId) {
    if (!this._device) return null;
    return AppwrightSelectors.getElementByXpath(
      this._device,
      `//*[@data-testid="${testId}"]`,
    );
  }

  // ============================================================
  // APP-LEVEL SELECTORS
  // ============================================================

  get connectLegacyButton() {
    return this._getByTestId('app-btn-connect-legacy');
  }

  get disconnectButton() {
    return this._getByTestId('app-btn-disconnect');
  }

  get errorSection() {
    return this._getByTestId('app-section-error');
  }

  // ============================================================
  // LEGACY EVM CARD SELECTORS
  // ============================================================

  get legacyEvmCard() {
    return this._getByTestId('legacy-evm-card');
  }

  get chainIdValue() {
    return this._getByTestId('legacy-evm-chain-id-value');
  }

  get accountsValue() {
    return this._getByTestId('legacy-evm-accounts-value');
  }

  get activeAccount() {
    return this._getByTestId('legacy-evm-active-account');
  }

  get responseText() {
    return this._getByTestId('legacy-evm-response-text');
  }

  get personalSignButton() {
    return this._getByTestId('legacy-evm-btn-personal-sign');
  }

  get signTypedDataV4Button() {
    return this._getByTestId('legacy-evm-btn-sign-typed-data-v4');
  }

  get sendTransactionButton() {
    return this._getByTestId('legacy-evm-btn-send-transaction');
  }

  get switchToMainnetButton() {
    return this._getByTestId('legacy-evm-btn-switch-mainnet');
  }

  get switchToPolygonButton() {
    return this._getByTestId('legacy-evm-btn-switch-polygon');
  }

  get switchToGoerliButton() {
    return this._getByTestId('legacy-evm-btn-switch-goerli');
  }

  get getBalanceButton() {
    return this._getByTestId('legacy-evm-btn-get-balance');
  }

  get blockNumberButton() {
    return this._getByTestId('legacy-evm-btn-block-number');
  }

  get gasPriceButton() {
    return this._getByTestId('legacy-evm-btn-gas-price');
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  async tapConnectLegacy() {
    if (!this._device) return;
    const element = await this.connectLegacyButton;
    await AppwrightGestures.tap(element);
  }

  async tapDisconnect() {
    if (!this._device) return;
    const element = await this.disconnectButton;
    await AppwrightGestures.tap(element);
  }

  async tapPersonalSign() {
    if (!this._device) return;
    const element = await this.personalSignButton;
    await AppwrightGestures.tap(element);
  }

  async tapSignTypedDataV4() {
    if (!this._device) return;
    const element = await this.signTypedDataV4Button;
    await AppwrightGestures.tap(element);
  }

  async tapSendTransaction() {
    if (!this._device) return;
    const element = await this.sendTransactionButton;
    await AppwrightGestures.tap(element);
  }

  async tapSwitchToMainnet() {
    if (!this._device) return;
    const element = await this.switchToMainnetButton;
    await AppwrightGestures.tap(element);
  }

  async tapSwitchToPolygon() {
    if (!this._device) return;
    const element = await this.switchToPolygonButton;
    await AppwrightGestures.tap(element);
  }

  async tapSwitchToGoerli() {
    if (!this._device) return;
    const element = await this.switchToGoerliButton;
    await AppwrightGestures.tap(element);
  }

  async tapGetBalance() {
    if (!this._device) return;
    const element = await this.getBalanceButton;
    await AppwrightGestures.tap(element);
  }

  // ============================================================
  // ASSERTIONS
  // ============================================================

  /**
   * Assert that the dapp is connected by checking for the active account element
   * @param {boolean} isConnected - Expected connection state
   */
  async assertConnected(isConnected = true) {
    if (!this._device) return;

    if (isConnected) {
      // When connected, the legacy EVM card with active account should be visible
      const activeAccountElement = await this.activeAccount;
      await expect(activeAccountElement).toBeVisible({ timeout: 10000 });
    } else {
      // When disconnected, the connect button should be visible
      const connectButton = await this.connectLegacyButton;
      await expect(connectButton).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Assert the connected chain ID value
   * @param {string} expectedChainId - Expected chain ID (e.g., '0x1', '0x89')
   */
  async assertChainIdValue(expectedChainId) {
    if (!this._device) return;
    const chainElement = await this.chainIdValue;
    const text = await chainElement.getText();
    expect(text).toContain(expectedChainId);
  }

  /**
   * Assert the response text contains expected value
   * @param {string} expectedValue - Expected value in response
   */
  async assertResponseValue(expectedValue) {
    if (!this._device) return;
    const responseElement = await this.responseText;
    const text = await responseElement.getText();
    expect(text).toContain(expectedValue);
  }

  /**
   * Assert the active account address
   * @param {string} expectedAccount - Expected account address
   */
  async assertActiveAccount(expectedAccount) {
    if (!this._device) return;
    const accountElement = await this.activeAccount;
    const text = await accountElement.getText();
    expect(text.toLowerCase()).toContain(expectedAccount.toLowerCase());
  }

  /**
   * Assert the number of connected accounts
   * @param {number} expectedCount - Expected account count
   */
  async assertAccountsCount(expectedCount) {
    if (!this._device) return;
    const accountsElement = await this.accountsValue;
    const text = await accountsElement.getText();
    expect(text).toContain(`${expectedCount} available`);
  }

  /**
   * Check if dapp is connected (returns boolean, doesn't throw)
   * @returns {Promise<boolean>}
   */
  async isConnected() {
    if (!this._device) return false;
    try {
      const activeAccountElement = await this.activeAccount;
      await expect(activeAccountElement).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

export default new BrowserPlaygroundDapp();
