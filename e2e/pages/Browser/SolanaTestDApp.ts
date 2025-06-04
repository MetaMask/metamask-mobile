import { dataTestIds } from '@metamask/test-dapp-solana';
import { getLocalTestDappPort } from '../../fixtures/utils';
import Matchers from '../../utils/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import Browser from './BrowserView';
import Gestures from '../../utils/Gestures';
import { waitFor } from 'detox';
import { SolanaTestDappSelectorsWebIDs } from '../../selectors/Browser/SolanaTestDapp.selectors';

// Use the same port as the regular test dapp - the solanaDapp flag controls which dapp is served
export const SOLANA_TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;

function getTestElement(
  dataTestId: string,
  options: { extraXPath?: string; tag?: string } = {},
): Promise<
  Detox.IndexableMaybeSecuredWebElement & Detox.SecuredWebElementFacade
> {
  const { extraXPath = '', tag = 'div' } = options;
  const xpath = `//${tag}[@data-testid="${dataTestId}"]${extraXPath}`;

  return Matchers.getElementByXPath(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    xpath,
  );
}

/**
 * Class to interact with the Multichain Test DApp via WebView
 */
class SolanaTestDApp {
  /**
   * WebView element getters
   */
  get connectButtonSelector() {
    return getTestElement(dataTestIds.testPage.header.connect, {
      extraXPath: '/div/button',
    });
  }

  get disconnectButtonSelector() {
    return getTestElement(dataTestIds.testPage.header.disconnect, {
      extraXPath: '/button',
    });
  }

  get endpointSelector() {
    return getTestElement(dataTestIds.testPage.header.endpoint, {
      tag: 'input',
    });
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

  async reloadSolanaTestDApp(): Promise<void> {
    await Browser.reloadTab();

    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)))
      .toBeVisible()
      .withTimeout(10000);
  }

  /**
   * Tap a button in the WebView
   */
  async tapButton(
    elementId:
      | Detox.WebElement
      | Detox.IndexableWebElement
      | Detox.SecuredWebElementFacade,
  ): Promise<void> {
    await Gestures.scrollToWebViewPort(
      Promise.resolve(elementId as Detox.IndexableWebElement),
    );
    await Gestures.tapWebElement(
      Promise.resolve(elementId as Detox.IndexableWebElement),
    );
  }

  getHeader() {
    return {
      connect: async () => {
        await this.tapButton(await this.connectButtonSelector);
      },
      disconnect: async () => {
        await this.tapButton(await this.disconnectButtonSelector);
      },
      selectMetaMask: async () => {
        await this.tapButton(await this.walletButtonSelector);
      },
      getConnectionStatus: async () => {
        const connectionStatusDiv = await getTestElement(
          dataTestIds.testPage.header.connectionStatus,
        );
        return await connectionStatusDiv.getText();
      },
      getAccount: async () => {
        const account = await getTestElement(
          dataTestIds.testPage.header.account,
          { extraXPath: '/a' },
        );
        return await account.getText();
      },
    };
  }

  /**
   * Get the WebView object for interaction
   */
  getWebView() {
    return web(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)).atIndex(0);
  }

  async refreshPage(): Promise<void> {
    const webview = this.getWebView();
    // await webview.element(by.web.tag('body')).runScript('(el) => { window.location.reload(); return "refreshed"; }');
    await webview.element(by.web.tag('body')).runScript('() => { window.location.reload(); }');
  }

  getSignMessageTest() {
    return {
      // setMessage: (message: string) => {}, // TODO: fix
      // this.setInputValue(dataTestIds.testPage.signMessage.message, message),
      signMessage: async () =>
        await this.tapButton(
          await getTestElement(dataTestIds.testPage.signMessage.signMessage, {
            tag: 'button',
          }),
        ),
      getSignedMessage: async () =>
        (
          await getTestElement(dataTestIds.testPage.signMessage.signedMessage, {
            tag: 'pre',
          })
        ).getText(),
    };
  }

  getSendSolTest() {
    return {
      signTransaction: async () => await this.tapButton(await getTestElement(dataTestIds.testPage.sendSol.signTransaction, { tag: 'button' })),
      sendTransaction: async () => await this.tapButton(await getTestElement(dataTestIds.testPage.sendSol.sendTransaction, { tag: 'button' })),
      getSignedTransaction: async () => (await getTestElement(dataTestIds.testPage.sendSol.signedTransaction, { tag: 'pre' })).getText(),
      getTransactionHash: async () => (await getTestElement(dataTestIds.testPage.sendSol.transactionHash, { tag: 'pre' })).getText(),
    };
  }
}

export default new SolanaTestDApp();
