import { dataTestIds } from '@metamask/test-dapp-bitcoin';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils';
import type { PlaywrightElement } from '../../framework/PlaywrightAdapter';
import Matchers from '../../framework/Matchers';
import type { PlaywrightElement } from '../../framework/PlaywrightAdapter';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Gestures from '../../framework/Gestures';
import Browser from './BrowserView';
import Utilities, { BASE_DEFAULTS } from '../../framework/Utilities';
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
): Promise<DetoxElement | WebElement | PlaywrightElement> {
  const { tag = 'div', extraXPath = '' } = options;
  const xpath = `//${tag}[@data-testid="${dataTestId}"]${extraXPath}`;

  return Matchers.getElementByXPath(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    xpath,
  );
}

class BitcoinTestDapp {
  get connectButtonSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.header.connect, {
      tag: 'button',
    });
  }

  get disconnectButtonSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.header.disconnect, {
      tag: 'button',
    });
  }

  get walletButtonSelector(): WebElement {
    return getTestElement(
      dataTestIds.testPage.walletSelectionModal.walletOption,
      {
        tag: 'button',
      },
    );
  }

  get standardButtonSelector(): WebElement {
    return getTestElement(
      dataTestIds.testPage.walletSelectionModal.standardButton,
      {
        tag: 'button',
      },
    );
  }

  get signMessageButtonSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.signMessage.signMessage, {
      tag: 'button',
    });
  }

  get confirmSignMessageButtonSelector(): WebElement {
    return Matchers.getElementByText('Approve');
  }

  async navigateToBitcoinTestDApp(): Promise<void> {
    await Browser.tapUrlInputBox();

    await Browser.navigateToURL(getDappUrl(0));

    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)))
      .toBeVisible()
      .withTimeout(10000);

    await this.waitForDappLoaded();
  }

  async reloadBitcoinTestDApp(): Promise<void> {
    await Browser.reloadTab();
    await this.waitForDappLoaded();
  }

  /**
   * Tap a button in the WebView
   */
  async tapButton(webElement: WebElement): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
        await (expect(await webElement) as any).toExist();
        await (await webElement).tap();
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'Tap Bitcoin test dapp button',
      },
    );
  }

  async waitForDappLoaded(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await this.getHeader().getConnectionStatus();
      },
      {
        timeout: 30_000,
        description: 'Bitcoin test dapp to load',
      },
    );
  }

  async waitForWalletOption(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
        await (expect(await this.walletButtonSelector) as any).toExist();
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'Bitcoin test dapp wallet option to appear',
      },
    );
  }

  async openWalletSelectionModal(): Promise<void> {
    await this.tapButton(this.connectButtonSelector);

    try {
      await this.waitForWalletOption();
    } catch (error) {
      await this.reloadBitcoinTestDApp();
      await this.tapButton(this.connectButtonSelector);
      await this.waitForWalletOption();
    }
  }

  getHeader() {
    return {
      connect: async () => {
        await this.openWalletSelectionModal();
      },
      disconnect: async () => {
        await this.tapButton(this.disconnectButtonSelector);
      },
      selectMetaMask: async () => {
        await this.tapButton(this.walletButtonSelector);
      },
      selectStandard: async () => {
        await this.tapButton(this.standardButtonSelector);
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

  async signMessage(): Promise<void> {
    await this.tapButton(this.signMessageButtonSelector);
  }

  async verifyConnectedAccount(connectionStatus: string): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const account = await getTestElement(
          dataTestIds.testPage.header.account,
          {
            extraXPath: '/a',
          },
        );
        const actualText = await account.getText();

        if (actualText !== connectionStatus) {
          throw new Error(
            `Expected text containing "${connectionStatus}" but got "${actualText}"`,
          );
        }
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'Verify connection status',
      },
    );
  }

  async verifyConnectionStatus(connectionStatus: string): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const connectionStatusDiv = await getTestElement(
          dataTestIds.testPage.header.connectionStatus,
        );
        const actualText = await connectionStatusDiv.getText();

        if (actualText !== connectionStatus) {
          throw new Error(
            `Expected text containing "${connectionStatus}" but got "${actualText}"`,
          );
        }
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'Verify connection status',
      },
    );
  }

  async verifySignedMessage(signedMessage: string): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const signedMessageElement = await getTestElement(
          dataTestIds.testPage.signMessage.signedMessage,
          {
            tag: 'pre',
          },
        );
        const actualText = await signedMessageElement.getText();

        if (actualText !== signedMessage) {
          throw new Error(
            `Expected text containing "${signedMessage}" but got "${actualText}"`,
          );
        }
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'Verify signed message',
      },
    );
  }

  async confirmSignMessage(): Promise<void> {
    await Gestures.waitAndTap(this.confirmSignMessageButtonSelector);
  }
}

export default new BitcoinTestDapp();
