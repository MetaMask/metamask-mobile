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
  // WAGMI CARD SELECTORS
  // ============================================================

  get connectWagmiButton() {
    return this._getByTestId('app-btn-connect-wagmi');
  }

  get wagmiCard() {
    return this._getByTestId('wagmi-card');
  }

  get wagmiChainIdValue() {
    return this._getByTestId('wagmi-chain-id-value');
  }

  get wagmiAccountValue() {
    return this._getByTestId('wagmi-account-value');
  }

  get wagmiActiveAccount() {
    return this._getByTestId('wagmi-active-account');
  }

  get wagmiBalanceValue() {
    return this._getByTestId('wagmi-balance-value');
  }

  get wagmiSignMessageInput() {
    return this._getByTestId('wagmi-input-message');
  }

  get wagmiSignMessageButton() {
    return this._getByTestId('wagmi-btn-sign-message');
  }

  get wagmiSignatureResult() {
    return this._getByTestId('wagmi-signature-result');
  }

  get wagmiSendTxToAddressInput() {
    return this._getByTestId('wagmi-input-to-address');
  }

  get wagmiSendTxAmountInput() {
    return this._getByTestId('wagmi-input-amount');
  }

  get wagmiSendTransactionButton() {
    return this._getByTestId('wagmi-btn-send-transaction');
  }

  get wagmiTxHashResult() {
    return this._getByTestId('wagmi-tx-hash-result');
  }

  /**
   * Get the switch chain button for a specific chain ID
   * @param {number} chainId - The chain ID
   */
  getWagmiSwitchChainButton(chainId) {
    return this._getByTestId(`wagmi-btn-switch-chain-${chainId}`);
  }

  // ============================================================
  // MULTICHAIN / SCOPE CARD SELECTORS
  // ============================================================

  get connectButton() {
    return this._getByTestId('app-btn-connect');
  }

  get connectedScopesSection() {
    return this._getByTestId('app-section-scopes');
  }

  /**
   * Get the scope card for a specific scope (e.g., 'eip155-1')
   * @param {string} scope - The CAIP-2 scope with colons replaced by dashes
   */
  getScopeCard(scope) {
    // The scope card ID uses dashes instead of colons (e.g., 'eip155-1' not 'eip155:1')
    const escapedScope = scope.replace(/:/g, '-');
    return this._getByTestId(`scope-card-${escapedScope}`);
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
  // WAGMI ACTIONS
  // ============================================================

  async tapConnectWagmi() {
    if (!this._device) return;
    const element = await this.connectWagmiButton;
    await AppwrightGestures.tap(element);
  }

  async tapWagmiSignMessage() {
    if (!this._device) return;
    const element = await this.wagmiSignMessageButton;
    await AppwrightGestures.tap(element);
  }

  async tapWagmiSendTransaction() {
    if (!this._device) return;
    const element = await this.wagmiSendTransactionButton;
    await AppwrightGestures.tap(element);
  }

  async tapWagmiSwitchChain(chainId) {
    if (!this._device) return;
    const element = await this.getWagmiSwitchChainButton(chainId);
    await AppwrightGestures.tap(element);
  }

  async typeWagmiSignMessage(message) {
    if (!this._device) return;
    const element = await this.wagmiSignMessageInput;
    await AppwrightGestures.typeText(element, message);
  }

  // ============================================================
  // MULTICHAIN ACTIONS
  // ============================================================

  async tapConnect() {
    if (!this._device) return;
    const element = await this.connectButton;
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

  // ============================================================
  // WAGMI ASSERTIONS
  // ============================================================

  /**
   * Assert Wagmi is connected by checking for the wagmi card
   * @param {boolean} isConnected - Expected connection state
   */
  async assertWagmiConnected(isConnected = true) {
    if (!this._device) return;

    if (isConnected) {
      const wagmiCardElement = await this.wagmiActiveAccount;
      await expect(wagmiCardElement).toBeVisible({ timeout: 10000 });
    } else {
      const connectButton = await this.connectWagmiButton;
      await expect(connectButton).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Assert Wagmi chain ID value
   * @param {string|number} expectedChainId - Expected chain ID (e.g., 1, '1', or '0x1')
   */
  async assertWagmiChainIdValue(expectedChainId) {
    if (!this._device) return;
    const chainElement = await this.wagmiChainIdValue;
    const text = await chainElement.getText();
    expect(text).toContain(String(expectedChainId));
  }

  /**
   * Assert Wagmi active account address
   * @param {string} expectedAccount - Expected account address
   */
  async assertWagmiActiveAccount(expectedAccount) {
    if (!this._device) return;
    const accountElement = await this.wagmiActiveAccount;
    const text = await accountElement.getText();
    expect(text.toLowerCase()).toContain(expectedAccount.toLowerCase());
  }

  /**
   * Assert Wagmi signature result contains expected value
   * @param {string} expectedValue - Expected signature or part of it
   */
  async assertWagmiSignatureResult(expectedValue) {
    if (!this._device) return;
    const signatureElement = await this.wagmiSignatureResult;
    const text = await signatureElement.getText();
    expect(text).toContain(expectedValue);
  }

  /**
   * Check if Wagmi is connected (returns boolean, doesn't throw)
   * @returns {Promise<boolean>}
   */
  async isWagmiConnected() {
    if (!this._device) return false;
    try {
      const wagmiCardElement = await this.wagmiActiveAccount;
      await expect(wagmiCardElement).toBeVisible({ timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // MULTICHAIN ASSERTIONS
  // ============================================================

  /**
   * Assert multichain is connected by checking for scope cards
   * @param {boolean} isConnected - Expected connection state
   */
  async assertMultichainConnected(isConnected = true) {
    if (!this._device) return;

    if (isConnected) {
      const scopesSection = await this.connectedScopesSection;
      await expect(scopesSection).toBeVisible({ timeout: 10000 });
    } else {
      const connectButton = await this.connectButton;
      await expect(connectButton).toBeVisible({ timeout: 10000 });
    }
  }

  /**
   * Assert a specific scope card is visible
   * @param {string} scope - The CAIP-2 scope (e.g., 'eip155:1')
   */
  async assertScopeCardVisible(scope) {
    if (!this._device) return;
    const scopeCard = await this.getScopeCard(scope);
    await expect(scopeCard).toBeVisible({ timeout: 10000 });
  }
}

export default new BrowserPlaygroundDapp();
