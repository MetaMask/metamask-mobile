import { dataTestIds } from '@metamask/test-dapp-solana';
import { getLocalTestDappPort } from '../../fixtures/utils';
import Matchers from '../../utils/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import Browser from './BrowserView';
import Gestures from '../../utils/Gestures';
import { waitFor } from 'detox';
import {
  SOLANA_TEST_TIMEOUTS,
  SolanaTestDappSelectorsWebIDs,
} from '../../selectors/Browser/SolanaTestDapp.selectors';
import TestHelpers from '../../helpers';

// Use the same port as the regular test dapp - the solanaDapp flag controls which dapp is served
export const SOLANA_TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;

/**
 * Get a test element by data-testid
 * @param dataTestId - The data-testid of the element
 * @param options.tag - The tag of the element having the data-testid attribute (e.g. 'div', 'input', etc.). Defaults to 'div'
 * @param options.extraXPath - The extra xpath to the element (e.g. '/div/button'), useful for accessing elements we aren't able to assign a data-testid to
 * @returns The test element
 */
function getTestElement(
  dataTestId: string,
  options: { extraXPath?: string; tag?: string } = {},
): Promise<Detox.IndexableWebElement & Detox.SecuredWebElementFacade> {
  const { tag = 'div', extraXPath = '' } = options;
  const xpath = `//${tag}[@data-testid="${dataTestId}"]${extraXPath}`;

  return Matchers.getElementByXPath(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    xpath,
  );
}

/**
 * Class to interact with the Multichain Test DApp via the WebView
 */
class SolanaTestDApp {
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
      SolanaTestDappSelectorsWebIDs.WALLET_BUTTON,
    );
  }

  get confirmTransactionButtonSelector() {
    return Matchers.getElementByID(
      SolanaTestDappSelectorsWebIDs.CONFIRM_TRANSACTION_BUTTON,
    );
  }

  get confirmSignMessageButtonSelector() {
    return Matchers.getElementByID(
      SolanaTestDappSelectorsWebIDs.CONFIRM_SIGN_MESSAGE_BUTTON,
    );
  }

  async navigateToSolanaTestDApp(): Promise<void> {
    await Browser.tapUrlInputBox();

    await Browser.navigateToURL(SOLANA_TEST_DAPP_LOCAL_URL);

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
  async tapButton(webElement: WebElement): Promise<void> {
    await Gestures.scrollToWebViewPort(webElement);
    await Gestures.tapWebElement(webElement);
  }

  getHeader() {
    return {
      connect: async () => {
        await this.tapButton(this.connectButtonSelector);
      },
      disconnect: async () => {
        await this.tapButton(this.disconnectButtonSelector);
      },
      selectMetaMask: async () => {
        await this.tapButton(this.walletButtonSelector);
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

  getSignMessageTest() {
    return {
      signMessage: async () => {
        await TestHelpers.delay(SOLANA_TEST_TIMEOUTS.METHOD_INVOCATION);
        await this.tapButton(
          getTestElement(dataTestIds.testPage.signMessage.signMessage, {
            tag: 'button',
          }),
        );
      },
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
      signTransaction: async () => {
        await TestHelpers.delay(SOLANA_TEST_TIMEOUTS.METHOD_INVOCATION);
        await this.tapButton(
          getTestElement(dataTestIds.testPage.sendSol.signTransaction, {
            tag: 'button',
          }),
        );
      },
      sendTransaction: async () => {
        await TestHelpers.delay(SOLANA_TEST_TIMEOUTS.METHOD_INVOCATION);
        await this.tapButton(
          getTestElement(dataTestIds.testPage.sendSol.sendTransaction, {
            tag: 'button',
          }),
        );
      },
      getSignedTransaction: async () =>
        (
          await getTestElement(dataTestIds.testPage.sendSol.signedTransaction, {
            tag: 'pre',
          })
        ).getText(),
      getTransactionHash: async () =>
        (
          await getTestElement(dataTestIds.testPage.sendSol.transactionHash, {
            tag: 'pre',
          })
        ).getText(),
    };
  }

  async confirmTransaction(): Promise<void> {
    await TestHelpers.delay(SOLANA_TEST_TIMEOUTS.DEFAULT_DELAY);
    await Gestures.waitAndTap(this.confirmTransactionButtonSelector);
  }

  async confirmSignMessage(): Promise<void> {
    await TestHelpers.delay(SOLANA_TEST_TIMEOUTS.DEFAULT_DELAY);
    await Gestures.waitAndTap(this.confirmSignMessageButtonSelector);
  }

  async tapCancelButton(): Promise<void> {
    const cancelButton = element(by.text('Cancel'));
    await waitFor(cancelButton)
      .toBeVisible()
      .withTimeout(SOLANA_TEST_TIMEOUTS.ELEMENT_VISIBILITY)
      .catch(); // Fixes component accessibility error causing timeout to be reached, even though the cancel button is visible and clickable
    await TestHelpers.delay(SOLANA_TEST_TIMEOUTS.DEFAULT_DELAY);
    await cancelButton.tap();
  }
}

export default new SolanaTestDApp();
