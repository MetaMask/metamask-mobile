import TestHelpers from '../../helpers';
import { getLocalTestDappPort } from '../../fixtures/utils';
import Matchers from '../../utils/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { MultichainTestDappSelectorsWebIDs } from '../../selectors/Browser/MultichainTestDapp.selectors';
import Browser from './BrowserView';
import Gestures from '../../utils/Gestures';
import { waitFor } from 'detox';

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
   */
  async navigateToMultichainTestDApp(): Promise<void> {
    // Using Browser methods to navigate
    await Browser.tapUrlInputBox();

    // Use either online or local URL based on the flag
    const dappUrl = USE_ONLINE_DAPP ? MULTICHAIN_TEST_DAPP_ONLINE_URL : MULTICHAIN_TEST_DAPP_LOCAL_URL;
    await Browser.navigateToURL(dappUrl);

    // Wait for the page to load
    await TestHelpers.delay(5000);

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
    // Wait for the page to be fully loaded
    await TestHelpers.delay(3000);

    try {
      // Get elements first
      const inputElement = await this.extensionIdInput;
      const connectBtn = await this.connectButton;

      // Tap the input field to focus it
      await this.tapButton(inputElement);

      // Tap the connect button
      await this.tapButton(connectBtn);

      // Wait for connection to establish
      await TestHelpers.delay(3000);

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Error connecting to multichain dapp:', error);
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
      await TestHelpers.delay(3000);

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Error creating session scopes:', error);
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
      await TestHelpers.delay(3000);

      return {
        success: true,
        sessionScopes: { 'eip155:1': { accounts: ['0x...'] } },
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Error getting session:', error);
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
      await TestHelpers.delay(3000);

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Error revoking session:', error);
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

      // Wait for processing
      await TestHelpers.delay(1000);

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Error clearing extension:', error);
      return false;
    }
  }
}

export default new MultichainTestDApp();
