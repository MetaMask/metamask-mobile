/* eslint-disable no-console */
import { getLocalTestDappPort } from '../../fixtures/utils';
import Matchers from '../../utils/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import Browser from './BrowserView';
import Gestures from '../../utils/Gestures';
import { waitFor } from 'detox';
import { SolanaTestDappSelectorsWebIDs } from '../../selectors/Browser/SolanaTestDapp.selectors';

// Use the same port as the regular test dapp - the solanaDapp flag controls which dapp is served
export const SOLANA_TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;

/**
 * Class to interact with the Multichain Test DApp via WebView
 */
class SolanaTestDApp {
  /**
   * WebView element getters
  */
  get walletModalSelector() {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      SolanaTestDappSelectorsWebIDs.WALLET_MODAL_SELECTOR,
    );
  }

  get walletButtonSelector() {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      SolanaTestDappSelectorsWebIDs.WALLET_BUTTON_SELECTOR,
    );
  }

  /**
   * Navigate to the solana test dapp
   */
  async navigateToSolanaTestDApp(): Promise<void> {
    // Using Browser methods to navigate
    await Browser.tapUrlInputBox();

    await Browser.navigateToURL(SOLANA_TEST_DAPP_LOCAL_URL);

    // Wait for WebView to be visible using native Detox waitFor
    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)))
      .toBeVisible()
      .withTimeout(10000);
  }


  /**
   * Tap a button in the WebView
   */
  async tapButton(elementId: Detox.WebElement | Detox.IndexableWebElement | Detox.SecuredWebElementFacade): Promise<void> {
    await Gestures.scrollToWebViewPort(Promise.resolve(elementId as Detox.IndexableWebElement));
    await Gestures.tapWebElement(Promise.resolve(elementId as Detox.IndexableWebElement));
  }

  async getHeader() {
    return {
      connect: async () => {
        await this.tapButton(await this.walletModalSelector);
      },
      selectMetaMask: async () => {
        await this.tapButton(await this.walletButtonSelector);
      },
    };
  }

  /**
   * Get the WebView object for interaction
   */
  getWebView() {
    return web(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)).atIndex(0);
  }
}

export default new SolanaTestDApp();
