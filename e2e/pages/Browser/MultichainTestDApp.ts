/* eslint-disable no-restricted-syntax */
import TestHelpers from '../../helpers';
import { getDappPort } from '../../../tests/framework/fixtures/FixtureUtils';
import Matchers from '../../../tests/framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import {
  MultichainTestDappViewSelectorsIDs,
  MULTICHAIN_TEST_TIMEOUTS,
} from '../../selectors/Browser/MultichainTestDapp.selectors';
import Browser from './BrowserView';
import Gestures from '../../../tests/framework/Gestures';
import { waitFor } from 'detox';
import ConnectBottomSheet from './ConnectBottomSheet';
import MultichainUtilities from '../../utils/MultichainUtilities';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../wallet/TabBarComponent';
import Assertions from '../../../tests/framework/Assertions';
import { isCaipChainId } from '@metamask/utils';
import { createLogger } from '../../../tests/framework/logger';

const logger = createLogger({
  name: 'MultichainTestDApp',
});

// Use the same port as the regular test dapp - the multichainDapp flag controls which dapp is served
export const MULTICHAIN_TEST_DAPP_LOCAL_URL = `http://localhost:${getDappPort(0)}`;
export const DEFAULT_MULTICHAIN_TEST_DAPP_URL =
  'https://metamask.github.io/test-dapp-multichain/';

/**
 * Get the multichain test dapp URL based on environment configuration
 * Priority:
 * 1. USE_LOCAL_DAPP=true (local development server)
 * 2. MULTICHAIN_DAPP_URL environment variable (custom URL)
 * 3. Error if no URL is configured
 */
export function getMultichainTestDappUrl(): string {
  // Check for local development flag
  const useLocal = process.env.USE_LOCAL_DAPP !== 'false'; // default to true if not set
  if (useLocal) {
    logger.debug(
      `🏠 Using local multichain dapp URL: ${MULTICHAIN_TEST_DAPP_LOCAL_URL}`,
    );
    return MULTICHAIN_TEST_DAPP_LOCAL_URL;
  }

  // Check for custom URL from environment
  const customUrl = process.env.MULTICHAIN_DAPP_URL;
  if (customUrl) {
    logger.debug(`🌐 Using custom multichain dapp URL: ${customUrl}`);
    return customUrl;
  }

  logger.debug(
    `📱 Using default multichain dapp URL: ${DEFAULT_MULTICHAIN_TEST_DAPP_URL}`,
  );
  return DEFAULT_MULTICHAIN_TEST_DAPP_URL;
}

/**
 * Response object for getSession method
 */
interface SessionResponse {
  success: boolean;
  sessionScopes?: {
    [chainId: string]: {
      accounts: string[];
      methods?: string[];
    };
  };
}

/**
 * Class to interact with the Multichain Test DApp via WebView
 */
class MultichainTestDApp {
  /**
   * WebView element getters
   */
  get extensionIdInput() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappViewSelectorsIDs.EXTENSION_ID_INPUT,
    );
  }

  get connectButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappViewSelectorsIDs.CONNECT_BUTTON,
    );
  }

  get createSessionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappViewSelectorsIDs.CREATE_SESSION_BUTTON,
    );
  }

  get getSessionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappViewSelectorsIDs.GET_SESSION_BUTTON,
    );
  }

  get revokeSessionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappViewSelectorsIDs.REVOKE_SESSION_BUTTON,
    );
  }

  get clearExtensionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappViewSelectorsIDs.CLEAR_EXTENSION_BUTTON,
    );
  }

  /**
   * Navigate to the multichain test dapp
   * @param urlParams - Optional URL parameters to append (e.g., '?autoMode=true')
   */
  async navigateToMultichainTestDApp(urlParams = ''): Promise<void> {
    await Browser.tapUrlInputBox();
    const baseUrl = getMultichainTestDappUrl();
    const dappUrl = `${baseUrl}${urlParams}`;
    await Browser.navigateToURL(dappUrl);

    // Wait for WebView to be visible using native Detox waitFor
    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)))
      .toBeVisible()
      .withTimeout(10000);
  }

  /**
   * Common test setup: reverse port, login, navigate to browser, and open multichain dapp
   * @param urlParams - Optional URL parameters for the dapp (e.g., '?autoMode=true')
   * @param skipLogin - Optional boolean value to determine if login should be skipped
   */
  async setupAndNavigateToTestDapp(
    urlParams = '',
    skipLogin?: boolean,
  ): Promise<void> {
    if (!skipLogin) {
      await TestHelpers.reverseServerPort();
      await loginToApp();
    }
    await TabBarComponent.tapBrowser();
    await Assertions.checkIfVisible(Browser.browserScreenID);
    await this.navigateToMultichainTestDApp(urlParams);

    // Verify WebView is visible
    await Assertions.checkIfVisible(
      Promise.resolve(
        element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)),
      ),
    );
  }

  /**
   * Tap a button in the WebView
   * @param {any} elementId - The element ID to tap
   * @returns {Promise<void>}
   */
  // Detox ts scripts unclear here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async tapButton(elementId: any): Promise<void> {
    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.tap(elementId);
  }

  /**
   * Create a session with the specified scopes
   * @param {string[]} _scopes - The scopes to create session with
   * @param {string[]} _accounts - The accounts to use
   * @returns {Promise<boolean>} Success status
   */
  async initCreateSessionScopes(
    _scopes: string[],
    _accounts: string[] = [],
  ): Promise<boolean> {
    // Get element first
    const createSessionBtn = await this.createSessionButton;

    // Tap create session button
    await this.tapButton(createSessionBtn);

    // Wait for session creation
    await TestHelpers.delay(1500);

    return true;
  }

  /**
   * Clear extension ID
   * @returns {Promise<boolean>} Success status
   */
  async clearExtension(): Promise<boolean> {
    // Get element first
    const clearExtensionBtn = await this.clearExtensionButton;

    // Tap clear extension button
    await this.tapButton(clearExtensionBtn);

    return true;
  }

  /**
   * Connect to the dapp using JavaScript injection (alternative method)
   * This can be used as a fallback if the regular connect method doesn't work
   * @param {string} _extensionId - The extension ID to connect with
   * @returns {Promise<boolean>} Success status
   */
  async connectViaJS(_extensionId = 'window.postMessage'): Promise<boolean> {
    // Make sure the webview exists and is visible
    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)))
      .toBeVisible()
      .withTimeout(10000);

    // Tap the webview to ensure it has focus
    await element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)).tap();

    // Just tap the connect button directly as a fallback
    const connectBtn = await this.connectButton;
    await this.tapButton(connectBtn);

    // Wait for connection to establish
    await TestHelpers.delay(1500);

    return true;
  }

  /**
   * Get the WebView object for interaction
   * @private
   */
  private getWebView() {
    return Matchers.getWebViewByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
  }

  /**
   * Scroll to the top of the page
   */
  async scrollToPageTop(): Promise<void> {
    const webview = this.getWebView();
    await webview
      .element(by.web.tag('body'))
      .runScript('(el) => { window.scrollTo(0, 0); return true; }')
      .catch(() => {
        // Scroll might fail if page structure is different, but that's okay
      });
  }

  /**
   * Use the auto-connect button to connect with postMessage
   */
  async useAutoConnectButton(): Promise<boolean> {
    const webview = this.getWebView();
    const autoConnectButton = webview.element(
      by.web.id('auto-connect-postmessage-button'),
    );

    // Try to click the button - first with JS, then native tap
    const clicked = await autoConnectButton
      .runScript('(el) => { el.click(); }')
      .then(() => true)
      .catch(async () => {
        // JS click failed, try native tap
        await autoConnectButton.tap();
        return true;
      })
      .catch(() => false);

    if (!clicked) {
      logger.error('❌ Auto-connect failed: Could not click button');
      return false;
    }

    // Wait for connection to process
    await TestHelpers.delay(3000);

    // Verify connection status by checking if checkboxes are enabled
    const ethereumCheckbox = webview.element(
      by.web.id('network-checkbox-eip155-1'),
    );
    const isDisabled = await ethereumCheckbox
      .runScript('(el) => el ? el.disabled : true')
      .catch(() => true); // If we can't check, assume disabled

    if (isDisabled) {
      // Try additional wait
      await TestHelpers.delay(2000);

      const isStillDisabled = await ethereumCheckbox
        .runScript('(el) => el ? el.disabled : true')
        .catch(() => true);

      if (isStillDisabled) {
        logger.error('❌ Connection failed - checkboxes remain disabled');
        return false;
      }
    }

    return true;
  }

  /**
   * Select a network by chain ID
   */
  async selectNetwork(chainId: string): Promise<boolean> {
    const webview = this.getWebView();
    const escapedChainId = this.escapeChainIdForHtml(chainId);
    const networkCheckbox = webview.element(
      by.web.id(`network-checkbox-${escapedChainId}`),
    );

    await networkCheckbox.scrollToView();
    await networkCheckbox.runScript(
      '(el) => { if(!el.checked) { el.click(); } return el.checked; }',
    );

    return true;
  }

  /**
   * Tap the create session button
   */
  async tapCreateSessionButton(): Promise<void> {
    const webview = this.getWebView();
    const createSessionButton = webview.element(
      by.web.id('create-session-btn'),
    );

    await createSessionButton.scrollToView();
    await createSessionButton.runScript('(el) => { el.click(); }');

    // Wait for session creation
    await TestHelpers.delay(2000);
  }

  /**
   * Tap the get session button
   */
  async tapGetSessionButton(): Promise<void> {
    const webview = this.getWebView();
    const getSessionButton = webview.element(by.web.id('get-session-btn'));

    await getSessionButton.scrollToView();
    await getSessionButton.runScript('(el) => { el.click(); }');

    // Wait for processing
    await TestHelpers.delay(1000);
  }

  /**
   * Tap the revoke session button
   */
  async tapRevokeSessionButton(): Promise<void> {
    const webview = this.getWebView();
    const revokeSessionButton = webview.element(
      by.web.id('revoke-session-btn'),
    );

    await revokeSessionButton.scrollToView();
    await revokeSessionButton.runScript('(el) => { el.click(); }');

    // Wait for processing
    await TestHelpers.delay(1500);
  }

  /**
   * Get revoke session result data
   * @param resultIndex - The index of the result to retrieve (defaults to 0)
   */
  async getRevokeSessionData(
    resultIndex: number = 0,
  ): Promise<SessionResponse> {
    // Wait for result to be populated
    await TestHelpers.delay(2000);

    // Try to tap to expand the result (will do nothing if element doesn't exist)
    await this.tapFirstResultSummary(resultIndex);

    // Get the revoke result content
    const webview = this.getWebView();
    const revokeResult = webview.element(
      by.web.id(`session-method-result-${resultIndex}`),
    );

    const resultData = await revokeResult
      .runScript('(el) => el.textContent')
      .catch(() => null);

    if (resultData) {
      const parsedResult = JSON.parse(resultData);
      return {
        success: true,
        sessionScopes: parsedResult.sessionScopes || {},
      };
    }

    return { success: false, sessionScopes: {} };
  }

  /**
   * Complete multichain connection flow
   */
  async completeMultichainFlow(
    chainIds: string[] = [
      MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
      MultichainUtilities.CHAIN_IDS.LINEA_MAINNET,
    ],
  ): Promise<void> {
    // Scroll to top
    await this.scrollToPageTop();

    // Auto connect
    const connected = await this.useAutoConnectButton();
    if (!connected) throw new Error('Failed to connect to dapp');

    // Select networks
    for (const chainId of chainIds) {
      const selected = await this.selectNetwork(chainId);
      if (!selected) throw new Error(`Failed to select network ${chainId}`);
    }

    await this.tapCreateSessionButton();

    await this.tapGetSessionButton();
  }

  /**
   * Tap the result summary to expand session details
   * @param index - The index of the result to tap (defaults to 0)
   */
  async tapFirstResultSummary(index: number = 0): Promise<void> {
    try {
      const webview = this.getWebView();
      const firstResult = webview.element(
        by.web.id(`session-method-details-${index}`),
      );

      await firstResult.scrollToView();
      await firstResult.runScript('(el) => { if(!el.open) { el.click(); } }');

      await TestHelpers.delay(500);
    } catch (error) {
      // Element doesn't exist, which is expected when there's no session
      // This is a valid case, so we just return without error
      return;
    }
  }

  /**
   * Get session data by parsing the result from the dapp
   * @param resultIndex - The index of the result to retrieve (defaults to 0)
   */
  async getSessionData(resultIndex: number = 0): Promise<SessionResponse> {
    // Wait for result to be populated
    await TestHelpers.delay(2000);

    // Try to tap to expand the result (will do nothing if element doesn't exist)
    await this.tapFirstResultSummary(resultIndex);

    // Get the session result content
    const webview = this.getWebView();
    const sessionResult = webview.element(
      by.web.id(`session-method-result-${resultIndex}`),
    );

    const sessionData = await sessionResult
      .runScript('(el) => el.textContent')
      .catch(() => null);

    if (sessionData) {
      const parsedSession = JSON.parse(sessionData);
      return {
        success: true,
        sessionScopes: parsedSession.sessionScopes || {},
      };
    }

    return { success: false, sessionScopes: {} };
  }

  /**
   * Verify session contains specific chain IDs
   */
  async verifySessionContainsChains(
    expectedChainIds: string[],
  ): Promise<boolean> {
    const sessionData = await this.getSessionData();

    if (!sessionData.success || !sessionData.sessionScopes) {
      return false;
    }

    for (const chainId of expectedChainIds) {
      const fullChainId = chainId.startsWith('eip155:')
        ? chainId
        : `eip155:${chainId}`;
      if (!sessionData.sessionScopes[fullChainId]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the number of chains in the current session
   */
  async getSessionChainCount(): Promise<number> {
    const sessionData = await this.getSessionData();

    if (!sessionData.success || !sessionData.sessionScopes) {
      return 0;
    }

    return Object.keys(sessionData.sessionScopes).length;
  }

  /**
   * Check if the dapp is properly connected (checkboxes should be enabled)
   */
  async isConnectedToDapp(): Promise<boolean> {
    const webview = this.getWebView();
    const ethereumCheckbox = webview.element(
      by.web.id('network-checkbox-eip155-1'),
    );
    const isDisabled = await ethereumCheckbox
      .runScript('(el) => el ? el.disabled : true')
      .catch(() => true); // If we can't check, assume not connected
    return !isDisabled;
  }

  /**
   * Wait for the dapp to be connected (checkboxes enabled)
   */
  async waitForConnection(timeoutMs = 10000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const isConnected = await this.isConnectedToDapp();
      if (isConnected) {
        return true;
      }

      await TestHelpers.delay(1000);
    }

    return false;
  }

  /**
   * Verify the current state of network checkboxes using CSS :checked selector
   * This is the only reliable method that works in WebView (proven by testing)
   */
  async verifyNetworkCheckboxStates(
    chainIds: string[],
  ): Promise<Record<string, boolean>> {
    const webview = this.getWebView();
    const states: Record<string, boolean> = {};

    for (const chainId of chainIds) {
      const escapedChainId = this.escapeChainIdForHtml(chainId);
      const checkboxId = `network-checkbox-${escapedChainId}`;

      // Use CSS :checked pseudo-selector - the only method that works reliably
      const isChecked = await webview
        .element(by.web.cssSelector(`#${checkboxId}:checked`))
        .scrollToView()
        .then(() => true)
        .catch(() => false);

      states[chainId] = isChecked;
    }

    return states;
  }

  /**
   * Escape chain ID for HTML element IDs (matches dapp's escapeHtmlId function)
   * @param chainId - Decimal chain ID (e.g., '1')
   * @returns Escaped chain ID for HTML element ID (e.g., 'eip155-1')
   */
  private escapeChainIdForHtml(chainId: string): string {
    if (isCaipChainId(chainId)) {
      return chainId.replace(/:/g, '-');
    }

    return `eip155-${chainId}`;
  }

  /**
   * Get all supported network chain IDs for the dapp
   */
  private getAllSupportedNetworks(): string[] {
    return [
      MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
      MultichainUtilities.CHAIN_IDS.LINEA_MAINNET,
      MultichainUtilities.CHAIN_IDS.ARBITRUM_ONE,
      MultichainUtilities.CHAIN_IDS.AVALANCHE,
      MultichainUtilities.CHAIN_IDS.BSC,
      MultichainUtilities.CHAIN_IDS.OPTIMISM,
      MultichainUtilities.CHAIN_IDS.POLYGON,
      MultichainUtilities.CHAIN_IDS.ZKSYNC_ERA,
      MultichainUtilities.CHAIN_IDS.BASE,
      MultichainUtilities.CHAIN_IDS.LOCALHOST,
    ];
  }

  /**
   * Clear all network selections
   */
  async clearAllNetworkSelections(): Promise<boolean> {
    const webview = this.getWebView();
    const allNetworks = this.getAllSupportedNetworks();

    for (const chainId of allNetworks) {
      const escapedChainId = this.escapeChainIdForHtml(chainId);
      const checkboxId = `network-checkbox-${escapedChainId}`;

      const checkbox = webview.element(by.web.id(checkboxId));

      // Check if element exists and is checked, then uncheck
      const isChecked = await checkbox
        .runScript('(el) => el ? el.checked : false')
        .catch(() => false);

      if (isChecked) {
        await checkbox.tap().catch(async () => {
          // If tap fails, try JS click
          await checkbox.runScript(
            '(el) => { if(el && el.checked) { el.click(); } }',
          );
        });
        await TestHelpers.delay(200);
      }
    }

    return true;
  }

  /**
   * Select specific networks by chain IDs
   */
  async selectNetworks(chainIds: string[]): Promise<boolean> {
    const webview = this.getWebView();
    // Scroll to the network selection area first
    await this.scrollToPageTop();
    await TestHelpers.delay(1000);

    // First clear all network selections
    const cleared = await this.clearAllNetworkSelections();
    if (!cleared) {
      logger.error('❌ Failed to clear network selections');
      return false;
    }

    // Then select the requested networks
    for (const chainId of chainIds) {
      const escapedChainId = this.escapeChainIdForHtml(chainId);
      const checkboxId = `network-checkbox-${escapedChainId}`;

      const checkbox = webview.element(by.web.id(checkboxId));

      // Scroll to the checkbox to ensure it's visible
      await checkbox.scrollToView();
      await TestHelpers.delay(300);

      // Check current state using reliable CSS :checked selector
      const isCurrentlyChecked = await webview
        .element(by.web.cssSelector(`#${checkboxId}:checked`))
        .scrollToView()
        .then(() => true)
        .catch(() => false);

      // Only click if we need to change the state
      if (!isCurrentlyChecked) {
        const clicked = await checkbox
          .tap()
          .then(() => true)
          .catch(async () => {
            // If tap fails, try JS click
            await checkbox.runScript('(el) => { if(el) { el.click(); } }');
            return true;
          })
          .catch(() => false);

        if (!clicked) {
          logger.error(`❌ Failed to select network eip155:${chainId}`);
          return false;
        }

        await TestHelpers.delay(1500); // Wait for UI update
      }
    }

    return true;
  }

  /**
   * Create a session with specific networks
   */
  async createSessionWithNetworks(chainIds: string[]): Promise<void> {
    // Scroll to top
    await this.scrollToPageTop();

    // Connect
    const connected = await this.useAutoConnectButton();
    if (!connected) {
      throw new Error('Failed to connect to dapp');
    }

    // Select specific networks
    const networksSelected = await this.selectNetworks(chainIds);
    if (!networksSelected) {
      throw new Error('Failed to select networks');
    }

    // Create session
    await this.tapCreateSessionButton();

    // Handle the connect modal that appears after creating session
    await TestHelpers.delay(2000);
    await ConnectBottomSheet.tapConnectButton().catch(() => {
      // Connect modal may not have appeared or already handled
    });

    // Wait for the connection to be established
    await TestHelpers.delay(2000);
  }

  /**
   * Get session changed event data
   * @param {number} index - The index of the event result to retrieve
   * @returns {Promise<string|null>} The event text content or null if not found
   */
  async getSessionChangedEventData(index = 0): Promise<string | null> {
    const webview = this.getWebView();
    const elementId = `${MultichainTestDappViewSelectorsIDs.WALLET_SESSION_CHANGED_RESULT}${index}`;
    const eventResult = webview.element(by.web.id(elementId));

    try {
      await eventResult.scrollToView();
      const eventText = await eventResult.runScript(
        (el) => el.textContent || '',
      );
      return eventText;
    } catch (error) {
      logger.error(
        `Failed to get session changed event data at index ${index}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Subscribe to events on a specific chain
   * @param {string} chainId - The chain ID to subscribe to
   * @returns {Promise<boolean>} Success status
   */
  async subscribeToChainEvents(chainId: string): Promise<boolean> {
    const webview = this.getWebView();
    const scope = MultichainUtilities.getEIP155Scope(chainId);
    const escapedScope = scope.replace(/:/g, '-');
    const directButtonId = `${MultichainTestDappViewSelectorsIDs.DIRECT_INVOKE_PREFIX}${escapedScope}-eth_subscribe`;

    try {
      const directButton = webview.element(by.web.id(directButtonId));
      await directButton.tap();
      await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.DEFAULT_DELAY);
      return true;
    } catch (error) {
      logger.error(
        `Failed to subscribe to events for chain ${chainId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if notification container is empty
   * @returns {Promise<boolean>} True if empty, false otherwise
   */
  async isNotificationContainerEmpty(): Promise<boolean> {
    const webview = this.getWebView();

    try {
      const notificationContainer = webview.element(
        by.web.id(MultichainTestDappViewSelectorsIDs.WALLET_NOTIFY_CONTAINER),
      );
      await notificationContainer.scrollToView();

      const emptyMessage = webview.element(
        by.web.id(MultichainTestDappViewSelectorsIDs.WALLET_NOTIFY_EMPTY),
      );
      // For WebView elements, try to interact to check existence
      await emptyMessage.scrollToView();
      return true;
    } catch (error) {
      // Empty message not found means we have notifications
      return false;
    }
  }

  /**
   * Check if notifications are present
   * @returns {Promise<boolean>} True if notifications exist, false otherwise
   */
  async hasNotifications(): Promise<boolean> {
    const webview = this.getWebView();

    try {
      const firstNotification = webview.element(
        by.web.id(
          `${MultichainTestDappViewSelectorsIDs.WALLET_NOTIFY_DETAILS}0`,
        ),
      );
      await firstNotification.scrollToView();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Invoke a method on a specific chain
   * @param {string} chainId - The chain ID
   * @param {string} method - The method name (e.g., 'eth_chainId', 'eth_getBalance')
   * @returns {Promise<boolean>} Success status
   */
  async invokeMethodOnChain(chainId: string, method: string): Promise<boolean> {
    const webview = this.getWebView();
    const scope = MultichainUtilities.getScope(chainId);
    const escapedScope = scope.replace(/:/g, '-');
    const directButtonId = `${MultichainTestDappViewSelectorsIDs.DIRECT_INVOKE_PREFIX}${escapedScope}-${method}`;

    try {
      const directButton = webview.element(by.web.id(directButtonId));
      // WebView elements don't need visibility checks - tap will fail if element doesn't exist
      await directButton.tap();
      await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.DEFAULT_DELAY);
      return true;
    } catch (error) {
      logger.error(`Failed to invoke ${method} on chain ${chainId}:`, error);
      return false;
    }
  }

  /**
   * Get the result of an invoked method
   * @param {string} chainId - The chain ID
   * @param {string} method - The method name
   * @param {number} index - The result index
   * @returns {Promise<string|null>} The result text or null if not found
   */
  async getInvokeMethodResult(
    chainId: string,
    method: string,
    index = 0,
  ): Promise<string | null> {
    const webview = this.getWebView();
    const scope = MultichainUtilities.getScope(chainId);
    const escapedScope = scope.replace(/:/g, '-');

    try {
      // First try to scroll to the invoke container
      const invokeContainerId = `${MultichainTestDappViewSelectorsIDs.INVOKE_CONTAINER_PREFIX}${escapedScope}`;
      const invokeContainer = webview.element(by.web.id(invokeContainerId));
      await invokeContainer.scrollToView();
    } catch (error) {
      // Container might not exist or not be visible, continue anyway
    }

    await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.METHOD_INVOCATION);

    try {
      // Try to scroll to the result item
      const itemId = `${MultichainTestDappViewSelectorsIDs.METHOD_RESULT_ITEM_PREFIX}${escapedScope}-${method}-${index}`;
      const itemElement = webview.element(by.web.id(itemId));
      await itemElement.scrollToView();

      // Get the actual result content
      const resultElementId = `${MultichainTestDappViewSelectorsIDs.INVOKE_METHOD_RESULT_PREFIX}${escapedScope}-${method}-result-${index}`;
      const resultElement = webview.element(by.web.id(resultElementId));
      const resultText = await resultElement.runScript(
        (el) => el.textContent || '',
      );

      return resultText;
    } catch (error) {
      logger.error(
        `Failed to get result for ${method} on chain ${chainId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Replace the parameters for a method
   * @param {string} method - The method name
   * @param {object} params - The parameters to fill in
   * @returns {Promise<void>}
   */
  async replaceParams(
    scope: string,
    method: string,
    params: object,
  ): Promise<void> {
    const webview = this.getWebView();
    const escapedScope = this.escapeChainIdForHtml(scope);

    const textareaElement = webview.element(
      by.web.cssSelector(
        `[data-testid="${escapedScope}-collapsible-content-textarea"]`,
      ),
    );

    await textareaElement.scrollToView();

    const request = {
      method: 'wallet_invokeMethod',
      params: {
        scope,
        request: {
          method,
          params,
        },
      },
    };

    const requestText = JSON.stringify(request);

    // Handles updating the textarea value and triggering a change event
    // on a React controlled component
    await textareaElement.runScript(`
      (el) => {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')
          .set.call(el, ${JSON.stringify(requestText)});

        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
  }

  /**
   * Attempt to invoke a method using the invoke button (used for testing after revoke)
   * @param {string} scope - The scope of the method
   * @returns {Promise<boolean>} True if button was clicked, false otherwise
   */
  async attemptInvokeMethodWithButton(scope: string): Promise<boolean> {
    try {
      const webview = this.getWebView();
      const scopeId = this.escapeChainIdForHtml(scope);
      const invokeButtonId = `invoke-method-${scopeId}-btn`;

      const invokeButton = webview.element(by.web.id(invokeButtonId));
      await invokeButton.scrollToView();
      await invokeButton.runScript('(el) => { el.click(); }');

      // Wait for processing
      await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.DEFAULT_DELAY);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Invoke a method on a specific chain
   * @param {string} scope - The scope of the method (e.g., 'eip155:1')
   * @param {string} method - The method to select (e.g., 'wallet_getCallsStatus')
   * @param {object} params - The method parameters to override default values
   * @returns {Promise<void>}
   */
  async invokeMethod(
    scope: string,
    method: string,
    params?: object,
  ): Promise<void> {
    const webview = this.getWebView();
    const escapedScope = this.escapeChainIdForHtml(scope);
    const selectId = `method-select-${escapedScope}`;

    const selectElement = webview.element(by.web.id(selectId));
    await selectElement.scrollToView();

    await selectElement.runScript(`
    (el) => {
      el.value = '${method}';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  `);

    if (params) {
      await this.replaceParams(scope, method, params);
    }

    await TestHelpers.delay(MULTICHAIN_TEST_TIMEOUTS.DEFAULT_DELAY);

    await this.attemptInvokeMethodWithButton(scope);
  }
}

export default new MultichainTestDApp();
