import { dataTestIds } from '@metamask/test-dapp-solana';
import Matchers from '../../framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Browser from './BrowserView';
import Gestures from '../../framework/Gestures';
import { waitFor } from 'detox';
import { SolanaTestDappSelectorsWebIDs } from '../../selectors/Browser/SolanaTestDapp.selectors';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils';
import { Utilities } from '../../framework';

/**
 * Class to interact with the Multichain Test DApp via the WebView
 */
class SolanaTestDApp {
  get connectButtonSelector(): WebElement {
    return Matchers.getTestElement(dataTestIds.testPage.header.connect, {
      extraXPath: '/div/button',
    });
  }

  get disconnectButtonSelector(): WebElement {
    return Matchers.getTestElement(dataTestIds.testPage.header.disconnect, {
      extraXPath: '/button',
    });
  }

  get endpointSelector(): WebElement {
    return Matchers.getTestElement(dataTestIds.testPage.header.endpoint, {
      tag: 'input',
    });
  }

  get walletButtonSelector(): WebElement {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      SolanaTestDappSelectorsWebIDs.WALLET_BUTTON,
    );
  }

  get confirmTransactionButtonSelector(): WebElement {
    return Matchers.getElementByID(
      SolanaTestDappSelectorsWebIDs.CONFIRM_TRANSACTION_BUTTON,
    );
  }

  get confirmSignMessageButtonSelector(): WebElement {
    return Matchers.getElementByID(
      SolanaTestDappSelectorsWebIDs.CONFIRM_SIGN_MESSAGE_BUTTON,
    );
  }

  get cancelButtonSelector() {
    return Matchers.getElementByText('Cancel');
  }

  async navigateToSolanaTestDApp(): Promise<void> {
    await Browser.tapUrlInputBox();

    await Browser.navigateToURL(getDappUrl(0));

    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)))
      .toBeVisible()
      .withTimeout(10000);
  }

  async reloadSolanaTestDApp(): Promise<void> {
    await Browser.reloadTab();
  }

  /**
   * Tap a button in the WebView
   */
  async tapButton(webElement: WebElement): Promise<void> {
    await Gestures.scrollToWebViewPort(webElement);
    await Gestures.waitAndTap(webElement);
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
        const connectionStatusDiv = await Matchers.getTestElement(
          dataTestIds.testPage.header.connectionStatus,
        );
        return await connectionStatusDiv.getText();
      },
      getAccount: async () => {
        const account = await Matchers.getTestElement(
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
        await this.tapButton(
          Matchers.getTestElement(
            dataTestIds.testPage.signMessage.signMessage,
            {
              tag: 'button',
            },
          ),
        );
      },
      getSignedMessage: () =>
        Utilities.executeWithRetry(
          async () => {
            const el = await Matchers.getTestElement(
              dataTestIds.testPage.signMessage.signedMessage,
              { tag: 'pre' },
            );
            return el.getText();
          },
          { timeout: 30_000, description: 'read signed message from webview' },
        ),
    };
  }

  getSendSolTest() {
    return {
      signTransaction: async () => {
        await this.tapButton(
          Matchers.getTestElement(
            dataTestIds.testPage.sendSol.signTransaction,
            {
              tag: 'button',
            },
          ),
        );
      },
      sendTransaction: async () => {
        await this.tapButton(
          Matchers.getTestElement(
            dataTestIds.testPage.sendSol.sendTransaction,
            {
              tag: 'button',
            },
          ),
        );
      },
      getSignedTransaction: async () =>
        (
          await Matchers.getTestElement(
            dataTestIds.testPage.sendSol.signedTransaction,
            {
              tag: 'pre',
            },
          )
        ).getText(),
      getTransactionHash: async () =>
        (
          await Matchers.getTestElement(
            dataTestIds.testPage.sendSol.transactionHash,
            {
              tag: 'pre',
            },
          )
        ).getText(),
    };
  }

  async confirmTransaction(): Promise<void> {
    await Gestures.waitAndTap(this.confirmTransactionButtonSelector);
  }

  async confirmSignMessage(): Promise<void> {
    await Gestures.waitAndTap(this.confirmSignMessageButtonSelector);
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButtonSelector);
  }
}

export default new SolanaTestDApp();
