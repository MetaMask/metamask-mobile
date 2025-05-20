import TestHelpers from '../../helpers';
import { getLocalTestDappPort } from '../../fixtures/utils';
import Matchers from '../../utils/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import Browser from './BrowserView';
import Gestures from '../../utils/Gestures';
import Assertions from '../../utils/Assertions';

// Use the same port as the regular test dapp - the multichainDapp flag controls which dapp is served
export const MULTICHAIN_TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;

export const MultichainDappSelectorsWebIDs = {
  CONNECT_BUTTON: 'connectButton',
  CREATE_SESSION_BUTTON: 'createSessionButton',
  GET_SESSION_BUTTON: 'getSessionButton',
  PERMISSIONS_TAB: 'permissions-tab',
  EDIT_BUTTON: 'edit',
  CONFIRM_BUTTON: 'confirm-btn',
  NETWORK_CHECKBOX_PREFIX: 'network-checkbox-',
  ACCOUNT_CHECKBOX_PREFIX: 'account-checkbox-',
};

class MultichainTestDApp {
  get connectButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainDappSelectorsWebIDs.CONNECT_BUTTON,
    );
  }

  get createSessionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainDappSelectorsWebIDs.CREATE_SESSION_BUTTON,
    );
  }

  get getSessionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainDappSelectorsWebIDs.GET_SESSION_BUTTON,
    );
  }

  get permissionsTab() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      MultichainDappSelectorsWebIDs.PERMISSIONS_TAB,
    );
  }

  getNetworkCheckbox(networkId) {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      `${MultichainDappSelectorsWebIDs.NETWORK_CHECKBOX_PREFIX}${networkId}`,
    );
  }

  getAccountCheckbox(accountIndex) {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      `${MultichainDappSelectorsWebIDs.ACCOUNT_CHECKBOX_PREFIX}${accountIndex}`,
    );
  }

  async connect() {
    await Gestures.waitAndTap(this.connectButton);
  }

  async initCreateSessionScopes(scopes, accounts = []) {
    // This would ideally be implemented through direct WebView JavaScript execution
    // For now, we'll simulate it through UI interactions

    await Gestures.waitAndTap(this.createSessionButton);

    // Select the permissions tab to configure networks
    await Gestures.waitAndTap(this.permissionsTab);

    // Configure chain permissions
    // In a real implementation, you'd need more logic to select/deselect chains

    // Confirm the session creation
    await Gestures.waitAndTap(
      Matchers.getElementByWebID(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        MultichainDappSelectorsWebIDs.CONFIRM_BUTTON
      )
    );
  }

  async getSession() {
    await Gestures.waitAndTap(this.getSessionButton);

    // In a real implementation, you would need to get the result from the WebView
    // This is a placeholder - you'll need to implement a way to access the result
    // This might require additional work in the dapp to expose the result

    // Example placeholder for the return value structure:
    return {
      sessionScopes: {
        'eip155:1': {
          accounts: ['0x...'],
        },
      },
    };
  }

  async navigateToMultichainTestDApp() {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(MULTICHAIN_TEST_DAPP_LOCAL_URL);
    await this.waitForMultichainDappToLoad();
  }

  async waitForMultichainDappToLoad() {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await Assertions.webViewElementExists(this.connectButton);
        return; // Success - page is fully loaded
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          throw new Error(`Multichain test dapp failed to load after ${MAX_RETRIES} attempts: ${error.message}`);
        }
        await TestHelpers.delay(RETRY_DELAY);
      }
    }
  }
}

export default new MultichainTestDApp();
