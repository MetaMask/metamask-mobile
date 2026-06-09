import { dataTestIds } from '@metamask/test-dapp-solana';
import Matchers from '../../framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Browser from './BrowserView';
import { waitFor } from 'detox';
import { SolanaTestDappSelectorsWebIDs } from '../../selectors/Browser/SolanaTestDapp.selectors';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils';
import { Utilities } from '../../framework';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

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
): EncapsulatedElementType {
  const { tag = 'div', extraXPath = '' } = options;
  const xpath = `//${tag}[@data-testid="${dataTestId}"]${extraXPath}`;

  return encapsulated({
    detox: () =>
      Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        xpath,
      ),
    appium: () => PlaywrightMatchers.getElementByXPath(xpath),
  });
}

function getByCss(selector: string): EncapsulatedElementType {
  return encapsulated({
    detox: () =>
      Matchers.getElementByCSS(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        selector,
      ),
    appium: () => PlaywrightMatchers.getElementByCSS(selector),
  });
}

/**
 * Class to interact with the Multichain Test DApp via the WebView
 */
class SolanaTestDApp {
  get connectButtonSelector(): EncapsulatedElementType {
    return getTestElement(dataTestIds.testPage.header.connect, {
      extraXPath: '/div/button',
    });
  }

  get disconnectButtonSelector(): EncapsulatedElementType {
    return getTestElement(dataTestIds.testPage.header.disconnect, {
      extraXPath: '/button',
    });
  }

  get endpointSelector(): EncapsulatedElementType {
    return getTestElement(dataTestIds.testPage.header.endpoint, {
      tag: 'input',
    });
  }

  get walletButtonSelector(): EncapsulatedElementType {
    return getByCss(SolanaTestDappSelectorsWebIDs.WALLET_BUTTON);
  }

  get confirmTransactionButtonSelector(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SolanaTestDappSelectorsWebIDs.CONFIRM_TRANSACTION_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SolanaTestDappSelectorsWebIDs.CONFIRM_TRANSACTION_BUTTON,
        ),
    });
  }

  get confirmSignMessageButtonSelector(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SolanaTestDappSelectorsWebIDs.CONFIRM_SIGN_MESSAGE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SolanaTestDappSelectorsWebIDs.CONFIRM_SIGN_MESSAGE_BUTTON,
        ),
    });
  }

  get cancelButtonSelector(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText('Cancel'),
      appium: () => PlaywrightMatchers.getElementByText('Cancel'),
    });
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
  async tapButton(webElement: EncapsulatedElementType): Promise<void> {
    await UnifiedGestures.waitAndTap(webElement);
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
        await this.tapButton(
          getTestElement(dataTestIds.testPage.signMessage.signMessage, {
            tag: 'button',
          }),
        );
      },
      getSignedMessage: () =>
        Utilities.executeWithRetry(
          async () => {
            const el = await getTestElement(
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
          getTestElement(dataTestIds.testPage.sendSol.signTransaction, {
            tag: 'button',
          }),
        );
      },
      sendTransaction: async () => {
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
    await UnifiedGestures.waitAndTap(this.confirmTransactionButtonSelector);
  }

  async confirmSignMessage(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmSignMessageButtonSelector);
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButtonSelector);
  }
}

export default new SolanaTestDApp();
