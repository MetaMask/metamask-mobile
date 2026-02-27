import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { PLAYGROUND_PACKAGE_ID } from '../../tests/framework/Constants.ts';
import { expect } from 'appwright';

/**
 * Replicates the escapeTestId function from @metamask/playground-ui
 * so generated test IDs match those set in the React Native playground.
 */
function escapeTestId(value) {
  return value
    .toLowerCase()
    .replace(/:/g, '-')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Page Object for the React Native playground app (@metamask/react-native-playground).
 *
 * This is a standalone native APK installed alongside the MetaMask wallet.
 * Elements are accessed via testID (resource-id on Android) using getElementByID,
 * NOT via data-testid/XPath like the browser playground.
 */
class RNPlaygroundDapp {
  constructor() {
    this._device = null;
  }

  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }

  _getByTestId(testId) {
    if (!this._device) return null;
    return AppwrightSelectors.getElementByID(this._device, testId);
  }

  // ============================================================
  // APP-LEVEL SELECTORS
  // ============================================================

  get appContainer() {
    return this._getByTestId('app-container');
  }

  get appTitle() {
    return this._getByTestId('app-title');
  }

  get connectButton() {
    return this._getByTestId('app-btn-connect');
  }

  get disconnectButton() {
    return this._getByTestId('app-btn-disconnect');
  }

  get scopesSection() {
    return this._getByTestId('app-section-scopes');
  }

  get errorSection() {
    return this._getByTestId('app-section-error');
  }

  get connectLegacyButton() {
    return this._getByTestId('app-btn-connect-legacy');
  }

  // ============================================================
  // LEGACY EVM CARD SELECTORS
  // ============================================================

  get legacyEvmCard() {
    return this._getByTestId('legacy-evm-card');
  }

  get legacyEvmChainIdValue() {
    return this._getByTestId('legacy-evm-chain-id-value');
  }

  get legacyEvmAccountsValue() {
    return this._getByTestId('legacy-evm-accounts-value');
  }

  get legacyEvmActiveAccount() {
    return this._getByTestId('legacy-evm-active-account');
  }

  get legacyEvmResponseText() {
    return this._getByTestId('legacy-evm-response-text');
  }

  get legacyEvmBtnPersonalSign() {
    return this._getByTestId('legacy-evm-btn-personal-sign');
  }

  get legacyEvmBtnSendTransaction() {
    return this._getByTestId('legacy-evm-btn-send-transaction');
  }

  get legacyEvmBtnSwitchPolygon() {
    return this._getByTestId('legacy-evm-btn-switch-polygon');
  }

  // ============================================================
  // NETWORK CHECKBOX SELECTORS
  // ============================================================

  getNetworkCheckbox(caipChainId) {
    return this._getByTestId(
      `dynamic-inputs-checkbox-${escapeTestId(caipChainId)}`,
    );
  }

  // ============================================================
  // SCOPE CARD SELECTORS
  // ============================================================

  getScopeCard(scope) {
    return this._getByTestId(`scope-card-${escapeTestId(scope)}`);
  }

  getScopeNetworkName(scope) {
    return this._getByTestId(
      `scope-card-network-name-${escapeTestId(scope)}`,
    );
  }

  getMethodSelect(scope) {
    return this._getByTestId(
      `scope-card-method-select-${escapeTestId(scope)}`,
    );
  }

  getInvokeButton(scope) {
    return this._getByTestId(
      `scope-card-invoke-btn-${escapeTestId(scope)}`,
    );
  }

  getResultCode(scope, method, index = 0) {
    const escapedScope = escapeTestId(scope);
    const escapedMethod = escapeTestId(method);
    return this._getByTestId(
      `scope-card-result-code-${escapedScope}-${escapedMethod}-${index}`,
    );
  }

  getResultStatus(scope, method, index = 0) {
    const escapedScope = escapeTestId(scope);
    const escapedMethod = escapeTestId(method);
    return this._getByTestId(
      `scope-card-result-status-${escapedScope}-${escapedMethod}-${index}`,
    );
  }

  // ============================================================
  // APP SWITCHING
  // ============================================================

  async switchToPlayground() {
    if (!this._device) return;
    await this._device.activateApp(PLAYGROUND_PACKAGE_ID);
    await new Promise((r) => setTimeout(r, 1000));
  }

  async waitForPlaygroundReady(timeoutMs = 15000) {
    if (!this._device) return;
    const container = await this.appContainer;
    await expect(container).toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Ensure we are in the playground. If the app-container is not visible
   * (e.g. MetaMask is still in the foreground), switch to the playground
   * via activateApp and wait for it.
   * Uses app-container rather than app-title because the title can be
   * scrolled out of the React Native render tree while app-container
   * sits outside the ScrollView and is always present.
   */
  async ensureInPlayground() {
    if (!this._device) return;
    try {
      const container = await this.appContainer;
      await expect(container).toBeVisible({ timeout: 3000 });
    } catch {
      await this.switchToPlayground();
      await this.waitForPlaygroundReady();
    }
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  async tapNetworkCheckbox(caipChainId) {
    if (!this._device) return;
    const elem = await this.getNetworkCheckbox(caipChainId);
    await AppwrightGestures.tap(elem);
  }

  async tapConnect() {
    if (!this._device) return;
    const elem = await this.connectButton;
    await AppwrightGestures.tap(elem);
  }

  async tapConnectLegacy() {
    if (!this._device) return;
    const elem = await this.connectLegacyButton;
    await AppwrightGestures.tap(elem);
  }

  async tapLegacyEvmButton(buttonPromise) {
    if (!this._device) return;
    const elem = await buttonPromise;
    await AppwrightGestures.tap(elem);
  }

  async tapDisconnect() {
    if (!this._device) return;
    const elem = await this.disconnectButton;
    await AppwrightGestures.tap(elem);
  }

  /**
   * Select a method from the Picker dropdown on a scope card.
   * Taps the picker to open the native dropdown, scrolls within the dropdown
   * if needed to find the option, then taps it.
   */
  async selectMethod(scope, methodName, maxScrollAttempts = 10) {
    if (!this._device) return;
    const picker = await this.getMethodSelect(scope);
    await AppwrightGestures.tap(picker);
    await new Promise((r) => setTimeout(r, 500));

    const webDriverClient = this._device.webDriverClient;

    for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
      try {
        const option = await AppwrightSelectors.getElementByText(
          this._device,
          methodName,
          true,
        );
        const isVisible = await option.isVisible({ timeout: 1500 });
        if (isVisible) {
          await AppwrightGestures.tap(option);
          await new Promise((r) => setTimeout(r, 500));
          return;
        }
      } catch {
        // Option not found or not visible yet
      }

      // Swipe down inside the dropdown to scroll content up, revealing
      // items near the top of the list (e.g. personal_sign).
      await webDriverClient.executeScript('mobile: swipeGesture', [
        {
          left: 100,
          top: 400,
          width: 600,
          height: 600,
          direction: 'down',
          percent: 0.3,
        },
      ]);
      await new Promise((r) => setTimeout(r, 300));
    }

    throw new Error(
      `Method "${methodName}" not found in picker after ${maxScrollAttempts} scroll attempts`,
    );
  }

  async tapInvoke(scope) {
    if (!this._device) return;
    const elem = await this.getInvokeButton(scope);
    await AppwrightGestures.tap(elem);
  }

  /**
   * Scroll until the given element promise becomes visible.
   * @param {Promise<AppwrightLocator>} elemPromise
   * @param {object} options - Passed to AppwrightGestures.scrollIntoView
   */
  async scrollToElement(elemPromise, options = {}) {
    if (!this._device) return;
    await AppwrightGestures.scrollIntoView(this._device, elemPromise, options);
  }

  // ============================================================
  // ASSERTIONS
  // ============================================================

  async assertConnected() {
    if (!this._device) return;
    const scopes = await this.scopesSection;
    await expect(scopes).toBeVisible({ timeout: 15000 });
  }

  async assertDisconnected() {
    if (!this._device) return;
    const btn = await this.connectButton;
    await expect(btn).toBeVisible({ timeout: 15000 });
  }

  async assertScopeCardVisible(scope, timeoutMs = 10000) {
    if (!this._device) return;
    const card = await this.getScopeCard(scope);
    await expect(card).toBeVisible({ timeout: timeoutMs });
  }

  /**
   * Wait for a result code element to appear for a given scope/method.
   */
  async waitForResult(scope, method, index = 0, timeoutMs = 15000) {
    if (!this._device) return;
    const code = await this.getResultCode(scope, method, index);
    await expect(code).toBeVisible({ timeout: timeoutMs });
  }

  async assertLegacyEvmConnected(timeoutMs = 15000) {
    if (!this._device) return;
    const card = await this.legacyEvmCard;
    await expect(card).toBeVisible({ timeout: timeoutMs });
  }

  async assertLegacyEvmHasAccounts(timeoutMs = 10000) {
    if (!this._device) return;
    const accounts = await this.legacyEvmAccountsValue;
    await expect(accounts).toBeVisible({ timeout: timeoutMs });
  }

  async assertLegacyEvmActiveAccount(timeoutMs = 10000) {
    if (!this._device) return;
    const activeAcct = await this.legacyEvmActiveAccount;
    await expect(activeAcct).toBeVisible({ timeout: timeoutMs });
  }

  async getLegacyEvmChainId() {
    if (!this._device) return null;
    const chainIdElem = await this.legacyEvmChainIdValue;
    return await chainIdElem.getText();
  }

  async getLegacyEvmResponseText() {
    if (!this._device) return null;
    const resp = await this.legacyEvmResponseText;
    return await resp.getText();
  }

  /**
   * Assert the result code text contains the expected substring.
   */
  async assertResultCodeContains(
    scope,
    method,
    expectedText,
    index = 0,
    timeoutMs = 15000,
  ) {
    if (!this._device) return;
    const code = await this.getResultCode(scope, method, index);
    await expect(code).toBeVisible({ timeout: timeoutMs });
    const text = await code.getText();
    expect(text).toContain(expectedText);
  }
}

export default new RNPlaygroundDapp();
