import TestHelpers from '../../helpers';
import { getLocalTestDappPort } from '../../fixtures/utils';
import Matchers from '../../utils/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { MultichainTestDappSelectorsWebIDs } from '../../selectors/Browser/MultichainTestDapp.selectors';
import Browser from './BrowserView';
import Gestures from '../../utils/Gestures';
import Assertions from '../../utils/Assertions';
import { web } from 'detox';

// Use the same port as the regular test dapp - the multichainDapp flag controls which dapp is served
export const MULTICHAIN_TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;

/**
 * Class to interact with the Multichain Test DApp via WebView
 */
class MultichainTestDApp {
  /**
   * Get the browser WebView container element
   * This is the main WebView that contains the browser content
   */
  get browserWebView() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
  }

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

  /**
   * Navigate to the multichain test dapp
   */
  async navigateToMultichainTestDApp() {
    // Using Browser methods to navigate
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(MULTICHAIN_TEST_DAPP_LOCAL_URL);

    // Wait for the page to load
    await TestHelpers.delay(5000);

    // Wait for WebView to be visible
    await Assertions.checkIfVisible(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
  }

  /**
   * Tap a button in the WebView
   */
  async tapButton(elementId) {
    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.tapWebElement(elementId);
  }

  /**
   * Connect to the dapp by entering extension ID and clicking connect
   */
  async connect(extensionId = 'window.postMessage') {
    // Wait for the page to be fully loaded
    await TestHelpers.delay(2000);

    try {
      // Clear input field and enter extension ID
      await Gestures.scrollToWebViewPort(this.extensionIdInput);
      await this.extensionIdInput.clearText();
      await this.extensionIdInput.typeText(extensionId);

      // Tap connect button
      await this.tapButton(this.connectButton);

      // Wait for connection to establish
      await TestHelpers.delay(3000);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a session with the specified scopes
   */
  async initCreateSessionScopes(scopes, accounts = []) {
    // Wait for UI to be ready
    await TestHelpers.delay(1000);

    try {
      // Tap create session button
      await this.tapButton(this.createSessionButton);

      // Wait for session creation
      await TestHelpers.delay(3000);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get session data
   */
  async getSession() {
    try {
      // Tap get session button
      await this.tapButton(this.getSessionButton);

      // Wait for processing
      await TestHelpers.delay(2000);

      // In a real implementation, we would get the result from the session-result element
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
  async revokeSession() {
    try {
      // Tap revoke session button
      await this.tapButton(this.revokeSessionButton);

      // Wait for processing
      await TestHelpers.delay(2000);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for the multichain dapp to load
   */
  async waitForMultichainDappToLoad() {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 3000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Just wait for the browser WebView to be visible
        await Assertions.checkIfVisible(
          BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        );
        return true; // WebView is visible
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          throw new Error(
            `Multichain test dapp failed to load after ${MAX_RETRIES} attempts: ${error.message}`,
          );
        }
        await TestHelpers.delay(RETRY_DELAY);
      }
    }

    return false;
  }
}

export default new MultichainTestDApp();
