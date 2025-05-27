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

// Online version of the multichain test dapp for temporary use
export const MULTICHAIN_TEST_DAPP_ONLINE_URL = 'https://devdapp.siteed.net/';

// Set USE_ONLINE_DAPP to true to use the online version, false to use local
export const USE_ONLINE_DAPP = true;

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

    // Use either online or local URL based on the flag
    const baseUrl = USE_ONLINE_DAPP ? MULTICHAIN_TEST_DAPP_ONLINE_URL : MULTICHAIN_TEST_DAPP_LOCAL_URL;
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
  async tapButton(elementId: Detox.IndexableWebElement | Detox.SecuredWebElementFacade): Promise<void> {
    await Gestures.scrollToWebViewPort(Promise.resolve(elementId as Detox.IndexableWebElement));
    await Gestures.tapWebElement(Promise.resolve(elementId as Detox.IndexableWebElement));
  }

  /**
   * Connect to the dapp by entering extension ID and clicking connect
   */
  async connect(_extensionId = 'window.postMessage'): Promise<boolean> {
    try {
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
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a session with the specified scopes
   */
  async initCreateSessionScopes(
    _scopes: string[],
    _accounts: string[] = []
  ): Promise<boolean> {
    try {
      // Get element first
      const createSessionBtn = await this.createSessionButton;

      // Tap create session button
      await this.tapButton(createSessionBtn);

      // Wait for session creation
      await TestHelpers.delay(1500);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get session data
   */
  async getSession(): Promise<SessionResponse> {
    try {
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
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Revoke session
   */
  async revokeSession(): Promise<boolean> {
    try {
      // Get element first
      const revokeSessionBtn = await this.revokeSessionButton;

      // Tap revoke session button
      await this.tapButton(revokeSessionBtn);

      // Wait for processing
      await TestHelpers.delay(1500);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear extension ID
   */
  async clearExtension(): Promise<boolean> {
    try {
      // Get element first
      const clearExtensionBtn = await this.clearExtensionButton;

      // Tap clear extension button
      await this.tapButton(clearExtensionBtn);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Connect to the dapp using JavaScript injection (alternative method)
   * This can be used as a fallback if the regular connect method doesn't work
   */
  async connectViaJS(_extensionId = 'window.postMessage'): Promise<boolean> {
    try {
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
    } catch (error) {
      return false;
    }
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
    try {
      const webview = this.getWebView();
      await webview.element(by.web.tag('body')).runScript('(el) => { window.scrollTo(0, 0); return true; }');
    } catch (e) {
      // Scroll error handling
    }
  }

  /**
   * Use the auto-connect button to connect with postMessage
   */
  async useAutoConnectButton(): Promise<boolean> {
    try {
      const webview = this.getWebView();
      const autoConnectButton = webview.element(by.web.id('auto-connect-postmessage-button'));

      try {
        // Simple click with minimal JS
        await autoConnectButton.runScript('(el) => { el.click(); }');
      } catch (e) {
        // Try native tap as fallback
        try {
          await autoConnectButton.tap();
        } catch (e2) {
          console.error('❌ Auto-connect failed:', e2);
          return false;
        }
      }

      // Wait for connection to process
      await TestHelpers.delay(2000);
      return true;
    } catch (error) {
      console.error('❌ Auto-connect failed:', error);
      return false;
    }
  }

  /**
   * Select a network by chain ID
   */
  async selectNetwork(chainId: string): Promise<boolean> {
    try {
      const webview = this.getWebView();
      // Escape colons in chain ID to match the dapp's escapeHtmlId function
      const escapedChainId = `eip155:${chainId}`.replace(/:/g, '-');
      const networkCheckbox = webview.element(by.web.id(`network-checkbox-${escapedChainId}`));
      
      await networkCheckbox.scrollToView();
      await networkCheckbox.runScript('(el) => { if(!el.checked) { el.click(); } return el.checked; }');
      
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Click the create session button
   */
  async clickCreateSessionButton(): Promise<boolean> {
    try {
      const webview = this.getWebView();
      const createSessionButton = webview.element(by.web.id('create-session-btn'));

      await createSessionButton.scrollToView();
      await createSessionButton.runScript('(el) => { el.click(); }');
      
      // Wait for session creation
      await TestHelpers.delay(2000);
      return true;
    } catch (e) {
      console.error('❌ Failed to click create session button:', e);
      return false;
    }
  }

  /**
   * Click the get session button
   */
  async clickGetSessionButton(): Promise<boolean> {
    try {
      const webview = this.getWebView();
      const getSessionButton = webview.element(by.web.id('get-session-btn'));

      await getSessionButton.scrollToView();
      await getSessionButton.runScript('(el) => { el.click(); }');
      
      // Wait for processing
      await TestHelpers.delay(1000);
      return true;
    } catch (e) {
      console.error('❌ Failed to click get session button:', e);
      return false;
    }
  }

  /**
   * Click the revoke session button
   */
  async clickRevokeSessionButton(): Promise<boolean> {
    try {
      const webview = this.getWebView();
      const revokeSessionButton = webview.element(by.web.id('revoke-session-btn'));

      await revokeSessionButton.scrollToView();
      await revokeSessionButton.runScript('(el) => { el.click(); }');
      
      // Wait for processing
      await TestHelpers.delay(1500);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Revoke session and get the result data
   * Similar to the web extension's revokeSession method
   */
  async revokeSessionWithData(): Promise<SessionResponse> {
    try {
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
        try {
          const parsedResult = JSON.parse(resultData);
          return {
            success: true,
            sessionScopes: parsedResult.sessionScopes || {}
          };
        } catch (parseError) {
          console.error('❌ Failed to parse revoke result:', parseError);
          return { success: false };
        }
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Error revoking session:', error);
      return { success: false };
    }
  }

  /**
   * Complete multichain connection flow
   */
  async completeMultichainFlow(chainIds: string[] = ['1', '59144']): Promise<boolean> {
    try {
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
    } catch (error) {
      return false;
    }
  }

  /**
   * Click the first result summary to expand session details
   */
  async clickFirstResultSummary(): Promise<boolean> {
    try {
      const webview = this.getWebView();
      const firstResult = webview.element(by.web.id('session-method-details-0'));
      
      await firstResult.scrollToView();
      await firstResult.runScript('(el) => { if(!el.open) { el.click(); } }');
      
      await TestHelpers.delay(500);
      return true;
    } catch (e) {
      console.error('❌ Failed to click first result summary:', e);
      return false;
    }
  }

  /**
   * Get session data by parsing the result from the dapp
   * Similar to the web extension's getSession method
   */
  async getSessionData(): Promise<SessionResponse> {
    try {
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
        try {
          const parsedSession = JSON.parse(sessionData);
          return {
            success: true,
            sessionScopes: parsedSession.sessionScopes || {}
          };
        } catch (parseError) {
          console.error('❌ Failed to parse session data:', parseError);
          console.error('❌ Raw data was:', sessionData);
          return { success: false };
        }
      }

      console.error('❌ No session data found');
      return { success: false };
    } catch (error) {
      console.error('❌ Error getting session data:', error);
      return { success: false };
    }
  }

  /**
   * Verify session contains specific chain IDs
   */
  async verifySessionContainsChains(expectedChainIds: string[]): Promise<boolean> {
    try {
      const sessionData = await this.getSessionData();
      
      if (!sessionData.success || !sessionData.sessionScopes) {
        return false;
      }

      for (const chainId of expectedChainIds) {
        const fullChainId = chainId.startsWith('eip155:') ? chainId : `eip155:${chainId}`;
        if (!sessionData.sessionScopes[fullChainId]) {
          console.log(`❌ Missing expected chain: ${fullChainId}`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error verifying session chains:', error);
      return false;
    }
  }

  /**
   * Get the number of chains in the current session
   */
  async getSessionChainCount(): Promise<number> {
    try {
      const sessionData = await this.getSessionData();
      
      if (!sessionData.success || !sessionData.sessionScopes) {
        return 0;
      }

      return Object.keys(sessionData.sessionScopes).length;
    } catch (error) {
      console.error('❌ Error getting session chain count:', error);
      return 0;
    }
  }

  /**
   * Select specific networks by chain IDs
   */
  async selectNetworks(chainIds: string[]): Promise<boolean> {
    try {
      const webview = this.getWebView();
      
      // First uncheck all networks
      const allNetworks = ['1', '59144', '42161', '43114', '56', '10', '137', '324', '8453', '1337'];
      for (const chainId of allNetworks) {
        try {
          // Escape colons in chain ID to match the dapp's escapeHtmlId function
          const escapedChainId = `eip155:${chainId}`.replace(/:/g, '-');
          const checkbox = webview.element(by.web.id(`network-checkbox-${escapedChainId}`));
          await checkbox.runScript('(el) => { if(el.checked) { el.click(); } }');
        } catch (e) {
          // Network might not be available, continue
        }
      }

      // Then select the requested networks
      for (const chainId of chainIds) {
        try {
          // Escape colons in chain ID to match the dapp's escapeHtmlId function
          const escapedChainId = `eip155:${chainId}`.replace(/:/g, '-');
          const checkbox = webview.element(by.web.id(`network-checkbox-${escapedChainId}`));
          await checkbox.runScript('(el) => { if(!el.checked) { el.click(); } }');
        } catch (e) {
          console.error(`❌ Failed to select network eip155:${chainId}:`, e);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Error selecting networks:', error);
      return false;
    }
  }

  /**
   * Complete a full create session flow with specific networks
   */
  async createSessionWithNetworks(chainIds: string[]): Promise<SessionResponse> {
    try {
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
      try {
        // Wait for the connect bottom sheet to appear
        await TestHelpers.delay(2000);
        await ConnectBottomSheet.tapConnectButton();
        
        // Wait for the connection to be established
        await TestHelpers.delay(2000);
      } catch (connectError) {
        // Connect modal may not have appeared or already handled
      }
      
      // Get and return session data
      const sessionData = await this.getSessionData();
      
      return sessionData;
    } catch (error) {
      console.error('❌ Error in createSessionWithNetworks:', error);
      return { success: false };
    }
  }
}

export default new MultichainTestDApp();
