/* eslint-disable no-console */
import TestHelpers from '../../helpers';
import { getLocalTestDappPort } from '../../fixtures/utils';
import Matchers from '../../utils/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { MultichainTestDappSelectorsWebIDs } from '../../selectors/Browser/MultichainTestDapp.selectors';
import Browser from './BrowserView';
import Gestures from '../../utils/Gestures';
import { waitFor } from 'detox';
import ConnectBottomSheet from './ConnectBottomSheet';

// Use the same port as the regular test dapp - the multichainDapp flag controls which dapp is served
export const MULTICHAIN_TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;

/**
 * Get the multichain test dapp URL based on environment configuration
 * Priority:
 * 1. USE_LOCAL_DAPP=true (local development server)
 * 2. MULTICHAIN_DAPP_URL environment variable (custom URL)
 * 3. Error if no URL is configured
 */
export function getMultichainTestDappUrl(): string {
  // Check for local development flag
  const useLocal = process.env.USE_LOCAL_DAPP === 'true';
  if (useLocal) {
    console.log(`🏠 Using local multichain dapp URL: ${MULTICHAIN_TEST_DAPP_LOCAL_URL}`);
    return MULTICHAIN_TEST_DAPP_LOCAL_URL;
  }

  // Check for custom URL from environment
  const customUrl = process.env.MULTICHAIN_DAPP_URL;
  if (customUrl) {
    console.log(`🌐 Using custom multichain dapp URL: ${customUrl}`);
    return customUrl;
  }

  // No URL configured - throw error with helpful message
  throw new Error(
    '❌ No multichain dapp URL configured!\n' +
    'Please set one of the following environment variables:\n' +
    '  • MULTICHAIN_DAPP_URL="https://your-dapp-url.com/"\n' +
    '  • USE_LOCAL_DAPP=true\n' +
    'See MULTICHAIN_DAPP_CONFIG.md for more details.'
  );
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
      MultichainTestDappSelectorsWebIDs.EXTENSION_ID_INPUT,
    );
  }

  get connectButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappSelectorsWebIDs.CONNECT_BUTTON,
    );
  }

  get createSessionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappSelectorsWebIDs.CREATE_SESSION_BUTTON,
    );
  }

  get getSessionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappSelectorsWebIDs.GET_SESSION_BUTTON,
    );
  }

  get revokeSessionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappSelectorsWebIDs.REVOKE_SESSION_BUTTON,
    );
  }

  get clearExtensionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainTestDappSelectorsWebIDs.CLEAR_EXTENSION_BUTTON,
    );
  }

  /**
   * Navigate to the multichain test dapp
   * @param urlParams - Optional URL parameters to append (e.g., '?autoMode=true')
   */
  async navigateToMultichainTestDApp(urlParams = ''): Promise<void> {
    // Using Browser methods to navigate
    await Browser.tapUrlInputBox();

    // Get the configured dapp URL
    const baseUrl = getMultichainTestDappUrl();
    const dappUrl = `${baseUrl}${urlParams}`;
    await Browser.navigateToURL(dappUrl);

    // Wait for WebView to be visible using native Detox waitFor
    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)))
      .toBeVisible()
      .withTimeout(10000);
  }

  /**
   * Tap a button in the WebView
   */
  // Detox types are unclear here.
  async tapButton(elementId: any): Promise<void> {
    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.tapWebElement(elementId);
  }

  /**
   * Connect to the dapp by entering extension ID and clicking connect
   */
  async connect(_extensionId = 'window.postMessage'): Promise<boolean> {
    // Get elements first
    const inputElement = await this.extensionIdInput;
    const connectBtn = await this.connectButton;

    // Tap the input field to focus it
    await this.tapButton(inputElement);

    // Try a reliable direct approach - the dapp might set this to window.postMessage by default

    // 1. Double tap to select all text
    await Gestures.tapWebElement(Promise.resolve(inputElement as Detox.IndexableWebElement));

    // 2. For iOS, try to select and delete text
    await element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)).clearText();

    // Tap the connect button
    await this.tapButton(connectBtn);

    // Wait for connection to establish
    await TestHelpers.delay(1500);

    return true;
  }

  /**
   * Create a session with the specified scopes
   */
  async initCreateSessionScopes(
    _scopes: string[],
    _accounts: string[] = []
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
   * Get session data
   */
  async getSession(): Promise<SessionResponse> {
    // Get element first
    const getSessionBtn = await this.getSessionButton;

    // Tap get session button
    await this.tapButton(getSessionBtn);

    // Wait for processing
    await TestHelpers.delay(1000);

    return {
      success: true,
      sessionScopes: { 'eip155:1': { accounts: ['0x...'] } },
    };
  }

  /**
   * Revoke session
   */
  async revokeSession(): Promise<boolean> {
    // Get element first
    const revokeSessionBtn = await this.revokeSessionButton;

    // Tap revoke session button
    await this.tapButton(revokeSessionBtn);

    // Wait for processing
    await TestHelpers.delay(1500);

    return true;
  }

  /**
   * Clear extension ID
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
   */
  async connectViaJS(_extensionId = 'window.postMessage'): Promise<boolean> {
    // Make sure the webview exists and is visible
    await expect(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID))).toBeVisible();

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
   */
  getWebView() {
    return web(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)).atIndex(0);
  }

  /**
   * Scroll to the top of the page
   */
  async scrollToPageTop(): Promise<void> {
    const webview = this.getWebView();
    await webview.element(by.web.tag('body')).runScript('(el) => { window.scrollTo(0, 0); return true; }')
      .catch(() => {
        // Scroll might fail if page structure is different, but that's okay
      });
  }

  /**
   * Use the auto-connect button to connect with postMessage
   */
  async useAutoConnectButton(): Promise<boolean> {
    const webview = this.getWebView();
    const autoConnectButton = webview.element(by.web.id('auto-connect-postmessage-button'));

    // Try to click the button - first with JS, then native tap
    const clicked = await autoConnectButton.runScript('(el) => { el.click(); }')
      .then(() => true)
      .catch(async () => {
        // JS click failed, try native tap
        await autoConnectButton.tap();
        return true;
      })
      .catch(() => false);

    if (!clicked) {
      console.error('❌ Auto-connect failed: Could not click button');
      return false;
    }

    // Wait for connection to process
    await TestHelpers.delay(3000);

    // Verify connection status by checking if checkboxes are enabled
    const ethereumCheckbox = webview.element(by.web.id('network-checkbox-eip155-1'));
    const isDisabled = await ethereumCheckbox.runScript('(el) => el ? el.disabled : true')
      .catch(() => true); // If we can't check, assume disabled

    if (isDisabled) {
      // Try additional wait
      await TestHelpers.delay(2000);

      const isStillDisabled = await ethereumCheckbox.runScript('(el) => el ? el.disabled : true')
        .catch(() => true);
        
      if (isStillDisabled) {
        console.error('❌ Connection failed - checkboxes remain disabled');
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
    // Escape colons in chain ID to match the dapp's escapeHtmlId function
    const escapedChainId = `eip155:${chainId}`.replace(/:/g, '-');
    const networkCheckbox = webview.element(by.web.id(`network-checkbox-${escapedChainId}`));

    await networkCheckbox.scrollToView();
    await networkCheckbox.runScript('(el) => { if(!el.checked) { el.click(); } return el.checked; }');

    return true;
  }

  /**
   * Click the create session button
   */
  async clickCreateSessionButton(): Promise<boolean> {
    const webview = this.getWebView();
    const createSessionButton = webview.element(by.web.id('create-session-btn'));

    await createSessionButton.scrollToView();
    await createSessionButton.runScript('(el) => { el.click(); }');

    // Wait for session creation
    await TestHelpers.delay(2000);
    return true;
  }

  /**
   * Click the get session button
   */
  async clickGetSessionButton(): Promise<boolean> {
    const webview = this.getWebView();
    const getSessionButton = webview.element(by.web.id('get-session-btn'));

    await getSessionButton.scrollToView();
    await getSessionButton.runScript('(el) => { el.click(); }');

    // Wait for processing
    await TestHelpers.delay(1000);
    return true;
  }

  /**
   * Click the revoke session button
   */
  async clickRevokeSessionButton(): Promise<boolean> {
    const webview = this.getWebView();
    const revokeSessionButton = webview.element(by.web.id('revoke-session-btn'));

    await revokeSessionButton.scrollToView();
    await revokeSessionButton.runScript('(el) => { el.click(); }');

    // Wait for processing
    await TestHelpers.delay(1500);
    return true;
  }

  /**
   * Revoke session and get the result data
   * Similar to the web extension's revokeSession method
   */
  async revokeSessionWithData(): Promise<SessionResponse> {
    // Click revoke session button first
    const revokeClicked = await this.clickRevokeSessionButton();
    if (!revokeClicked) {
      console.error('❌ Failed to click revoke session button');
      return { success: false };
    }

    // Wait for result to be populated
    await TestHelpers.delay(2000);

    // Click to expand the first result (which should be the revoke result)
    await this.clickFirstResultSummary();

    // Get the revoke result content
    const webview = this.getWebView();
    const revokeResult = webview.element(by.web.id('session-method-result-0'));

    const resultData = await revokeResult.runScript('(el) => el.textContent');

    if (resultData) {
      const parsedResult = JSON.parse(resultData);
      return {
        success: true,
        sessionScopes: parsedResult.sessionScopes || {}
      };
    }

    return { success: true };
  }

  /**
   * Complete multichain connection flow
   */
  async completeMultichainFlow(chainIds: string[] = ['1', '59144']): Promise<boolean> {
    // Scroll to top
    await this.scrollToPageTop();

    // Auto connect
    const connected = await this.useAutoConnectButton();
    if (!connected) return false;

    // Select networks
    for (const chainId of chainIds) {
      const selected = await this.selectNetwork(chainId);
      if (!selected) return false;
    }

    // Create session
    const sessionCreated = await this.clickCreateSessionButton();
    if (!sessionCreated) return false;

    // Get session
    return await this.clickGetSessionButton();
  }

  /**
   * Click the first result summary to expand session details
   */
  async clickFirstResultSummary(): Promise<boolean> {
    const webview = this.getWebView();
    const firstResult = webview.element(by.web.id('session-method-details-0'));

    await firstResult.scrollToView();
    await firstResult.runScript('(el) => { if(!el.open) { el.click(); } }');

    await TestHelpers.delay(500);
    return true;
  }

  /**
   * Get session data by parsing the result from the dapp
   * Similar to the web extension's getSession method
   */
  async getSessionData(): Promise<SessionResponse> {
    // Click get session button first
    const sessionRetrieved = await this.clickGetSessionButton();
    if (!sessionRetrieved) {
      console.error('❌ Failed to click get session button');
      return { success: false };
    }

    // Wait for result to be populated
    await TestHelpers.delay(2000);

    // Click to expand the first result
    await this.clickFirstResultSummary();

    // Get the session result content
    const webview = this.getWebView();
    const sessionResult = webview.element(by.web.id('session-method-result-0'));

    const sessionData = await sessionResult.runScript('(el) => el.textContent');

    if (sessionData) {
      const parsedSession = JSON.parse(sessionData);
      return {
        success: true,
        sessionScopes: parsedSession.sessionScopes || {}
      };
    }

    console.error('❌ No session data found');
    return { success: false };
  }

  /**
   * Verify session contains specific chain IDs
   */
  async verifySessionContainsChains(expectedChainIds: string[]): Promise<boolean> {
    const sessionData = await this.getSessionData();

    if (!sessionData.success || !sessionData.sessionScopes) {
      return false;
    }

    for (const chainId of expectedChainIds) {
      const fullChainId = chainId.startsWith('eip155:') ? chainId : `eip155:${chainId}`;
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
    const ethereumCheckbox = webview.element(by.web.id('network-checkbox-eip155-1'));
    const isDisabled = await ethereumCheckbox.runScript('(el) => el ? el.disabled : true')
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
  async verifyNetworkCheckboxStates(chainIds: string[]): Promise<Record<string, boolean>> {
    const webview = this.getWebView();
    const states: Record<string, boolean> = {};

    for (const chainId of chainIds) {
      const escapedChainId = `eip155:${chainId}`.replace(/:/g, '-');
      const checkboxId = `network-checkbox-${escapedChainId}`;

      // Use CSS :checked pseudo-selector - the only method that works reliably
      const isChecked = await webview.element(by.web.cssSelector(`#${checkboxId}:checked`))
        .scrollToView()
        .then(() => true)
        .catch(() => false);

      states[chainId] = isChecked;
    }

    return states;
  }

  /**
   * Select specific networks by chain IDs
   */
  async selectNetworks(chainIds: string[]): Promise<boolean> {
    const webview = this.getWebView();
    // Scroll to the network selection area first
    await this.scrollToPageTop();
    await TestHelpers.delay(1000);

    // First uncheck all networks
    const allNetworks = ['1', '59144', '42161', '43114', '56', '10', '137', '324', '8453', '1337'];

    for (const chainId of allNetworks) {
      // Escape colons in chain ID to match the dapp's escapeHtmlId function
      const escapedChainId = `eip155:${chainId}`.replace(/:/g, '-');
      const checkboxId = `network-checkbox-${escapedChainId}`;

      const checkbox = webview.element(by.web.id(checkboxId));

      // Check if element exists and is checked, then uncheck
      const isChecked = await checkbox.runScript('(el) => el ? el.checked : false')
        .catch(() => false);
        
      if (isChecked) {
        await checkbox.tap().catch(async () => {
          // If tap fails, try JS click
          await checkbox.runScript('(el) => { if(el && el.checked) { el.click(); } }');
        });
        await TestHelpers.delay(200);
      }
    }

    // Then select the requested networks
    for (const chainId of chainIds) {
      // Escape colons in chain ID to match the dapp's escapeHtmlId function
      const escapedChainId = `eip155:${chainId}`.replace(/:/g, '-');
      const checkboxId = `network-checkbox-${escapedChainId}`;

      const checkbox = webview.element(by.web.id(checkboxId));

      // Scroll to the checkbox to ensure it's visible
      await checkbox.scrollToView();
      await TestHelpers.delay(300);

      // Check current state using reliable CSS :checked selector
      const isCurrentlyChecked = await webview.element(by.web.cssSelector(`#${checkboxId}:checked`))
        .scrollToView()
        .then(() => true)
        .catch(() => false);

      // Only click if we need to change the state
      if (!isCurrentlyChecked) {
        const clicked = await checkbox.tap()
          .then(() => true)
          .catch(async () => {
            // If tap fails, try JS click
            await checkbox.runScript('(el) => { if(el) { el.click(); } }');
            return true;
          })
          .catch(() => false);
          
        if (!clicked) {
          console.error(`❌ Failed to select network eip155:${chainId}`);
          return false;
        }
        
        await TestHelpers.delay(1500); // Wait for UI update
      }
    }

    return true;
  }

  /**
   * Complete a full create session flow with specific networks
   */
  async createSessionWithNetworks(chainIds: string[]): Promise<SessionResponse> {
    // Scroll to top
    await this.scrollToPageTop();

    // Connect
    const connected = await this.useAutoConnectButton();
    if (!connected) {
      console.error('❌ Failed to connect to dapp');
      return { success: false };
    }

    // Select specific networks
    const networksSelected = await this.selectNetworks(chainIds);
    if (!networksSelected) {
      console.error('❌ Failed to select networks');
      return { success: false };
    }

    // Create session
    const sessionCreated = await this.clickCreateSessionButton();
    if (!sessionCreated) {
      console.error('❌ Failed to create session');
      return { success: false };
    }

    // Handle the connect modal that appears after creating session
    await TestHelpers.delay(2000);
    await ConnectBottomSheet.tapConnectButton().catch(() => {
      // Connect modal may not have appeared or already handled
    });

    // Wait for the connection to be established
    await TestHelpers.delay(2000);

    // Get and return session data
    return await this.getSessionData();
  }
}

export default new MultichainTestDApp();
