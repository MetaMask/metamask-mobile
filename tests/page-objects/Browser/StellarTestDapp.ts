import { dataTestIds } from '@metamask/test-dapp-stellar';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils';
import Matchers from '../../framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Gestures from '../../framework/Gestures';
import Browser from './BrowserView';
import Utilities, { BASE_DEFAULTS } from '../../framework/Utilities';
import { StellarTestDappSelectorsWebIDs } from '../../selectors/Browser/StellarTestDapp.selectors';

function getTestElement(
  dataTestId: string,
  options: { extraXPath?: string; tag?: string } = {},
): Promise<DetoxElement | WebElement> {
  const { tag = 'div', extraXPath = '' } = options;
  const xpath = `//${tag}[@data-testid="${dataTestId}"]${extraXPath}`;

  return Matchers.getElementByXPath(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    xpath,
  );
}

class StellarTestDapp {
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

  get networkSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.header.network, {
      tag: 'select',
    });
  }

  get metaMaskWalletOptionSelector(): WebElement {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      StellarTestDappSelectorsWebIDs.METAMASK_WALLET_OPTION_XPATH,
    );
  }

  get signMessageButtonSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.signMessage.signMessage, {
      tag: 'button',
    });
  }

  get loadExampleXdrButtonSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.signTransaction.loadExampleXdr, {
      tag: 'button',
    });
  }

  get signTransactionButtonSelector(): WebElement {
    return getTestElement(
      dataTestIds.testPage.signTransaction.signTransaction,
      {
        tag: 'button',
      },
    );
  }

  get signAuthEntryButtonSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.signAuthEntry.signAuthEntry, {
      tag: 'button',
    });
  }

  get authEntryTextareaSelector(): WebElement {
    return getTestElement(dataTestIds.testPage.signAuthEntry.authEntry, {
      tag: 'textarea',
    });
  }

  get confirmApproveButtonSelector(): WebElement {
    return Matchers.getElementByText('Approve');
  }

  async navigateToStellarTestDApp(): Promise<void> {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(getDappUrl(0));

    await waitFor(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID)))
      .toBeVisible()
      .withTimeout(10000);

    await this.waitForDappLoaded();
  }

  async reloadStellarTestDApp(): Promise<void> {
    await Browser.reloadTab();
    await this.waitForDappLoaded();
  }

  async tapButton(webElement: WebElement): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
        await (expect(await webElement) as any).toExist();
        await (await webElement).tap();
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'Tap Stellar test dapp button',
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
        description: 'Stellar test dapp to load',
      },
    );
  }

  async waitForWalletOption(): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const walletOption = await this.metaMaskWalletOptionSelector;
        // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
        await (expect(walletOption) as any).toExist();
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'Stellar test dapp MetaMask wallet option to appear',
      },
    );
  }

  async openWalletSelectionModal(): Promise<void> {
    await this.tapButton(this.connectButtonSelector);

    try {
      await this.waitForWalletOption();
    } catch {
      await this.reloadStellarTestDApp();
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
        await this.tapButton(this.metaMaskWalletOptionSelector);
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

  async selectNetwork(networkKey: string): Promise<void> {
    const select = await this.networkSelector;
    await select.runScript(`
      (el) => {
        el.value = ${JSON.stringify(networkKey)};
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
  }

  async signMessage(): Promise<void> {
    await this.tapButton(this.signMessageButtonSelector);
  }

  async loadExampleXdr(): Promise<void> {
    await this.tapButton(this.loadExampleXdrButtonSelector);
  }

  async signTransaction(): Promise<void> {
    await this.tapButton(this.signTransactionButtonSelector);
  }

  async fillAuthEntry(authEntryXdr: string): Promise<void> {
    const textarea = await this.authEntryTextareaSelector;
    await textarea.runScript(`
      (el) => {
        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')
          .set.call(el, ${JSON.stringify(authEntryXdr)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `);
  }

  async signAuthEntry(): Promise<void> {
    await this.tapButton(this.signAuthEntryButtonSelector);
  }

  private async verifyElementText(
    dataTestId: string,
    expected: string,
    description: string,
    options: { extraXPath?: string; tag?: string } = {},
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const element = await getTestElement(dataTestId, options);
        const actualText = await element.getText();

        if (actualText !== expected) {
          throw new Error(
            `Expected "${expected}" but got "${actualText}" (${description})`,
          );
        }
      },
      { timeout: BASE_DEFAULTS.timeout, description },
    );
  }

  private async verifyPreTextMatches(
    dataTestId: string,
    pattern: RegExp,
    description: string,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const element = await getTestElement(dataTestId, { tag: 'pre' });
        const actualText = await element.getText();

        if (!pattern.test(actualText)) {
          throw new Error(`${description}: ${actualText}`);
        }
      },
      { timeout: BASE_DEFAULTS.timeout, description },
    );
  }

  async verifyConnectedAccount(connectionStatus: string): Promise<void> {
    await this.verifyElementText(
      dataTestIds.testPage.header.account,
      connectionStatus,
      'Verify connected account',
      { extraXPath: '/a' },
    );
  }

  async verifyConnectionStatus(connectionStatus: string): Promise<void> {
    await this.verifyElementText(
      dataTestIds.testPage.header.connectionStatus,
      connectionStatus,
      'Verify connection status',
    );
  }

  async verifySignedMessageMatches(pattern: RegExp): Promise<void> {
    await this.verifyPreTextMatches(
      dataTestIds.testPage.signMessage.signedMessage,
      pattern,
      'Verify signed message',
    );
  }

  async verifySignedTransactionMatches(pattern: RegExp): Promise<void> {
    await this.verifyPreTextMatches(
      dataTestIds.testPage.signTransaction.signedTransaction,
      pattern,
      'Verify signed transaction',
    );
  }

  async verifySignedAuthEntryMatches(pattern: RegExp): Promise<void> {
    await this.verifyPreTextMatches(
      dataTestIds.testPage.signAuthEntry.signedAuthEntry,
      pattern,
      'Verify signed auth entry',
    );
  }

  async confirmSignMessage(): Promise<void> {
    await Gestures.waitAndTap(this.confirmApproveButtonSelector);
  }

  async confirmTransaction(): Promise<void> {
    await Gestures.waitAndTap(this.confirmApproveButtonSelector);
  }

  async confirmSignAuthEntry(): Promise<void> {
    await Gestures.waitAndTap(this.confirmApproveButtonSelector);
  }
}

export default new StellarTestDapp();
