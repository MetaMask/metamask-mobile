import enContent from '../../../locales/languages/en.json';

import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../app/components/Views/MultichainAccounts/shared/ConnectAccountBottomSheet.testIds';
import { TestDappSelectorsWebIDs } from '../../selectors/Browser/TestDapp.selectors';
import Browser from './BrowserView';
import { Assertions, TapOptions, Utilities, sleep } from '../../framework';
import { FrameworkDetector } from '../../framework/FrameworkDetector';
import { PlatformDetector } from '../../framework/PlatformLocator';
import PlaywrightWebMatchers from '../../framework/PlaywrightWebMatchers';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import { getDriver } from '../../framework/PlaywrightUtilities';
import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers';
import { createPlaywrightLogger } from '../../framework/playwrightLogger';

const logger = createPlaywrightLogger('TestDApp');

const CONFIRM_BUTTON_TEXT = enContent.confirmation_modal.confirm_cta;
const APPROVE_BUTTON_TEXT = enContent.transactions.tx_review_approve;
const CONNECT_BUTTON_TEXT = 'Connect';
const DAPP_ACCOUNTS_TEXT = 'Accounts:';

interface ContractNavigationParams {
  contractAddress: string;
}

const testDappPageUrl = (): string => getDappUrl(0);

const getTestDappWebElementById = (innerID: string): WebElement =>
  Matchers.getElementByWebID(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    innerID,
    testDappPageUrl(),
  );

const getTestDappWebElementByXPath = (xpath: string): WebElement =>
  Matchers.getElementByXPath(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    xpath,
    testDappPageUrl(),
  );

class TestDApp {
  get confirmButtonText(): EncapsulatedElementType {
    return Matchers.getElementByText(CONFIRM_BUTTON_TEXT);
  }

  get approveButtonText(): EncapsulatedElementType {
    return Matchers.getElementByText(APPROVE_BUTTON_TEXT);
  }

  get DappConnectButton(): WebElement {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.CONNECT_BUTTON);
  }

  get connectedAccounts(): WebElement {
    return getTestDappWebElementByXPath(
      `//*[contains(text(),"${DAPP_ACCOUNTS_TEXT}")]`,
    );
  }

  get ApproveERC20TokensButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.APPROVE_ERC_20_TOKENS_BUTTON_ID,
    );
  }

  get ApproveERC721TokenButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.APPROVE_ERC_721_TOKEN_BUTTON_ID,
    );
  }

  get invalidSignature(): WebElement {
    return getTestDappWebElementById('signInvalidType');
  }

  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get erc20TransferTokensButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ERC_20_SEND_TOKENS_TRANSFER_TOKENS_BUTTON_ID,
    );
  }

  get increaseAllowanceButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.INCREASE_ALLOWANCE_BUTTON_ID,
    );
  }

  get personalSignButton(): WebElement {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.PERSONAL_SIGN);
  }

  get signTypedDataButton(): WebElement {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.SIGN_TYPE_DATA);
  }

  get signTypedDataV3Button(): WebElement {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V3);
  }

  get signTypedDataV4Button(): WebElement {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V4);
  }

  get ethereumSignButton(): WebElement {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.ETHEREUM_SIGN);
  }

  get permitSignButton(): WebElement {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.PERMIT_SIGN);
  }

  get siweBadDomainButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ETHEREUM_SIGN_BAD_DOMAIN,
    );
  }

  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get nftTransferFromTokensButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.NFT_TRANSFER_FROM_BUTTON_ID,
    );
  }

  get nftSetApprovalForAllButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_NFT_BUTTON_ID,
    );
  }

  get addTokensToWalletButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ADD_TOKENS_TO_WALLET_BUTTON,
    );
  }

  get erc1155SetApprovalForAllButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_ERC1155_BUTTON_ID,
    );
  }

  get sendFailingTransactionButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.SEND_FAILING_TRANSACTION_BUTTON_ID,
    );
  }

  get erc1155BatchTransferButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.BATCH_TRANSFER_ERC1155_BUTTON_ID,
    );
  }

  get switchChainFromTestDappButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.SWITCH_ETHEREUM_CHAIN,
    );
  }

  get testDappFoxLogo(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.TEST_DAPP_FOX_LOGO,
    );
  }

  get testDappPageTitle(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.TEST_DAPP_HEADING_TITLE,
    );
  }

  get erc721MintButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ERC_721_MINT_BUTTON_ID,
    );
  }

  get sendEIP1559Button(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.SEND_EIP_1559_BUTTON_ID,
    );
  }

  get deployContractButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.DEPLOY_CONTRACT_BUTTON_ID,
    );
  }

  get sendCallsButton(): WebElement {
    return getTestDappWebElementById(TestDappSelectorsWebIDs.SEND_CALLS_BUTTON);
  }

  get revokeAccountPermission(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.REVOKE_ACCOUNTS_PERMISSIONS,
    );
  }

  get connectButtonText(): WebElement {
    return Matchers.getElementByText(CONNECT_BUTTON_TEXT);
  }

  get erc721RevokeApprovalButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ERC_721_REVOKE_APPROVAL_BUTTON_ID,
    );
  }

  get erc1155RevokeApprovalButton(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.ERC_1155_REVOKE_APPROVAL_BUTTON_ID,
    );
  }

  get openNetworkPicker(): WebElement {
    return getTestDappWebElementById(
      TestDappSelectorsWebIDs.OPEN_NETWORK_PICKER,
    );
  }

  get networkModalContent(): WebElement {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      '.network-modal-content',
    );
  }

  getNetworkItemByName(
    networkName: string,
    { exactMatch = false }: { exactMatch?: boolean } = {},
  ): WebElement {
    const textPredicate = exactMatch
      ? `text()="${networkName}"`
      : `contains(text(), "${networkName}")`;
    return getTestDappWebElementByXPath(
      `//div[contains(@class, "network-modal-item-name") and ${textPredicate}]`,
    );
  }

  get networkModalBody(): WebElement {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      '.network-modal-body',
    );
  }

  async verifyCurrentNetworkText(expectedNetworkName: string): Promise<void> {
    const expectedText = `Current Network: ${expectedNetworkName}`;

    await Assertions.expectElementToContainText(
      this.openNetworkPicker,
      expectedText,
      {
        description: `current network should contain "${expectedText}"`,
      },
    );
  }

  async getNetworkCellByLabel(networkLabel: string): Promise<DetoxElement> {
    // Try different indices to find the network with the matching label
    for (let index = 0; index < 10; index++) {
      try {
        const networkCell = await Matchers.getElementByIDAndLabel(
          'cellmultiselect',
          networkLabel,
          index,
        );
        await Assertions.expectElementToBeVisible(networkCell, {
          timeout: 1000,
        });
        return networkCell;
      } catch {
        // Continue to next index
      }
    }
    throw new Error(`Could not find network cell with label "${networkLabel}"`);
  }

  /**
   * Checks if the user is connected to the test dapp by checking if there are connected accounts
   * @returns true if connected, false otherwise
   */
  async isConnectedToTestDapp(): Promise<boolean> {
    return Utilities.executeWithRetry(
      async () => {
        const connectedAccounts = (await this
          .connectedAccounts) as IndexableWebElement;
        const text = await connectedAccounts.getText();
        const accountsText = text.replace(DAPP_ACCOUNTS_TEXT, '').trim();
        if (accountsText.length > 0) {
          return true;
        }
        throw new Error('Not connected to test dapp');
      },
      {
        timeout: 30000,
        description: 'Check if connected to test dapp',
      },
    );
  }

  async getConnectedAccounts(): Promise<string> {
    return this.readTestDappTextContentById(
      TestDappSelectorsWebIDs.ACCOUNTS_TEXT,
    );
  }

  async getConnectedChainId(): Promise<string> {
    return this.readTestDappTextContentById(
      TestDappSelectorsWebIDs.CHAIN_ID_TEXT,
    );
  }

  /**
   * Wait until the test-dapp element has non-empty textContent.
   * Appium: poll via string-form `driver.execute` (no findElement).
   */
  private async readTestDappTextContentById(webId: string): Promise<string> {
    return Utilities.executeWithRetry(
      async () => {
        let text = '';
        await PlaywrightWebMatchers.withWebViewAction(
          testDappPageUrl(),
          async () => {
            // String script — avoids WDIO function polyfill / WDA serialization.
            const result = await getDriver().execute(
              `return (document.getElementById(${JSON.stringify(
                webId,
              )})?.textContent || '').trim();`,
            );
            text = typeof result === 'string' ? result : '';
          },
        );
        if (!text) {
          throw new Error(
            `Test dapp #${webId} text is empty (provider may not have injected yet)`,
          );
        }
        return text;
      },
      {
        timeout: 30000,
        description: `Poll test dapp #${webId} textContent via JS`,
      },
    );
  }

  async connect(): Promise<void> {
    await Gestures.waitAndTap(this.DappConnectButton, {
      elemDescription: 'Dapp connect button',
    });
  }

  async tapApproveERC20TokensButton(): Promise<void> {
    await Gestures.waitAndTap(this.ApproveERC20TokensButton, {
      elemDescription: 'Approve ERC20 tokens button',
    });
  }

  async tapApproveERC721TokenButton(): Promise<void> {
    await Gestures.waitAndTap(this.ApproveERC721TokenButton, {
      elemDescription: 'Approve ERC721 token button',
    });
  }

  async tapInvalidSigButton(): Promise<void> {
    await Gestures.waitAndTap(this.invalidSignature, {
      elemDescription: 'Invalid signature button',
    });
  }

  async tapIncreaseAllowanceButton(): Promise<void> {
    await Gestures.waitAndTap(this.increaseAllowanceButton, {
      elemDescription: 'Increase allowance button',
    });
  }

  async tapAddERC20TokenToWalletButton(): Promise<void> {
    await Gestures.waitAndTap(this.addTokensToWalletButton, {
      elemDescription: 'Add ERC20 token to wallet button',
    });
  }

  async tapPersonalSignButton(): Promise<void> {
    await Gestures.waitAndTap(this.personalSignButton, {
      elemDescription: 'Personal sign button',
    });
  }

  async tapTypedSignButton(): Promise<void> {
    await Gestures.waitAndTap(this.signTypedDataButton, {
      elemDescription: 'Typed sign button',
    });
  }

  async tapTypedV3SignButton(): Promise<void> {
    await Gestures.waitAndTap(this.signTypedDataV3Button, {
      elemDescription: 'Typed V3 sign button',
    });
  }

  async tapTypedV4SignButton(): Promise<void> {
    await Gestures.waitAndTap(this.signTypedDataV4Button, {
      elemDescription: 'Typed V4 sign button',
    });
  }

  async tapEthereumSignButton(): Promise<void> {
    await Gestures.waitAndTap(this.ethereumSignButton, {
      elemDescription: 'Ethereum sign button',
    });
  }

  async tapPermitSignButton(): Promise<void> {
    await Gestures.waitAndTap(this.permitSignButton, {
      elemDescription: 'Permit sign button',
    });
  }

  async tapSIWEBadDomainButton(): Promise<void> {
    await Gestures.waitAndTap(this.siweBadDomainButton, {
      elemDescription: 'SIWE bad domain button',
    });
  }

  async tapERC20TransferButton(): Promise<void> {
    await Gestures.waitAndTap(this.erc20TransferTokensButton, {
      elemDescription: 'ERC20 transfer button',
    });
  }

  async tapNFTTransferButton(): Promise<void> {
    await Gestures.waitAndTap(this.nftTransferFromTokensButton, {
      elemDescription: 'NFT transfer button',
    });
  }

  async tapERC721MintButton(): Promise<void> {
    await Gestures.waitAndTap(this.erc721MintButton, {
      elemDescription: 'ERC721 mint button',
    });
  }

  async tapNFTSetApprovalForAllButton(): Promise<void> {
    await Gestures.waitAndTap(this.nftSetApprovalForAllButton, {
      elemDescription: 'NFT set approval for all button',
    });
  }

  async tapERC1155SetApprovalForAllButton(): Promise<void> {
    await Gestures.waitAndTap(this.erc1155SetApprovalForAllButton, {
      elemDescription: 'ERC1155 set approval for all button',
    });
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButtonText, {
      elemDescription: 'Confirm Button',
    });
  }

  async tapConfirmButtonToDisappear(): Promise<void> {
    await Gestures.tap(this.confirmButtonText, {
      elemDescription: 'Confirm Button',
      waitForElementToDisappear: true,
    });
  }

  async tapConnectButton(): Promise<void> {
    await Gestures.waitAndTap(this.connectButtonText, {
      elemDescription: 'Connect Button',
    });
  }

  async tapSwitchChainButton(timeoutMs = 15_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const clicked = await ChromeCdpHelpers.clickByIdInWebView(
        testDappPageUrl(),
        TestDappSelectorsWebIDs.SWITCH_ETHEREUM_CHAIN,
      );
      if (clicked) return;
      await sleep(300);
    }
    throw new Error(
      `Timed out waiting for #${TestDappSelectorsWebIDs.SWITCH_ETHEREUM_CHAIN} in TestDApp WebView`,
    );
  }

  /**
   * Clicks the Test Dapp `#connectButton` in the WebView (eth_requestAccounts).
   * Retries until the connect sheet appears — needed on slow Appium Android loads.
   */
  async tapDappConnectButton(timeoutMs = 15_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastClickAt = 0;
    let clickAttempts = 0;
    let lastClickResult: boolean | null = null;

    while (Date.now() < deadline) {
      if (Date.now() - lastClickAt >= 1_000) {
        lastClickAt = Date.now();
        clickAttempts += 1;
        lastClickResult = await ChromeCdpHelpers.evaluateInWebView<boolean>(
          testDappPageUrl(),
          `(() => {
            const el = document.getElementById(${JSON.stringify(
              TestDappSelectorsWebIDs.CONNECT_BUTTON,
            )});
            if (!el) return false;
            el.click();
            return true;
          })()`,
        );
        logger.info(
          `tapDappConnectButton attempt=${clickAttempts} cdpClick=${String(lastClickResult)} url=${testDappPageUrl()}`,
        );
      }

      try {
        const connectSheetButton = await PlaywrightMatchers.getElementById(
          ConnectAccountBottomSheetSelectorsIDs.CONNECT_BUTTON,
        );
        await connectSheetButton.unwrap().waitForDisplayed({ timeout: 500 });
        logger.info(
          `tapDappConnectButton connect sheet visible after ${clickAttempts} click attempt(s)`,
        );
        return;
      } catch {
        // Connect sheet not up yet.
      }

      await sleep(300);
    }

    const diagnostics = await ChromeCdpHelpers.evaluateInWebView<{
      href: string;
      hasConnectButton: boolean;
      hasEthereum: boolean;
      hasProviders: boolean;
      chainId: string | null;
      accountsText: string | null;
      selectedAddress: string | null;
    }>(
      testDappPageUrl(),
      `(() => {
        const connectEl = document.getElementById(${JSON.stringify(
          TestDappSelectorsWebIDs.CONNECT_BUTTON,
        )});
        const accountsEl = document.getElementById(${JSON.stringify(
          TestDappSelectorsWebIDs.ACCOUNTS_TEXT,
        )});
        const chainEl = document.getElementById(${JSON.stringify(
          TestDappSelectorsWebIDs.CHAIN_ID_TEXT,
        )});
        return {
          href: location.href,
          hasConnectButton: Boolean(connectEl),
          hasEthereum: typeof window.ethereum !== 'undefined',
          hasProviders: Array.isArray(window.ethereum?.providers)
            ? window.ethereum.providers.length > 0
            : Boolean(window.ethereum),
          chainId: chainEl ? (chainEl.textContent || null) : null,
          accountsText: accountsEl ? (accountsEl.textContent || null) : null,
          selectedAddress: window.ethereum?.selectedAddress ?? null,
        };
      })()`,
    );

    logger.error(
      `tapDappConnectButton timed out after ${clickAttempts} click attempt(s); lastClick=${String(lastClickResult)}; diagnostics=${JSON.stringify(diagnostics)}`,
    );

    throw new Error(
      `Timed out waiting for connect sheet after #${TestDappSelectorsWebIDs.CONNECT_BUTTON} click` +
        ` (attempts=${clickAttempts}, lastClick=${String(lastClickResult)}, diagnostics=${JSON.stringify(diagnostics)})`,
    );
  }

  async requestPermissions({
    accounts,
  }: { accounts?: string[] } = {}): Promise<void> {
    const request = JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_requestPermissions',
      params: [
        {
          eth_accounts: accounts
            ? {
                caveats: [
                  { type: 'restrictReturnedAccounts', value: accounts },
                ],
              }
            : {},
        },
      ],
    });
    await ChromeCdpHelpers.evaluateInWebView(
      testDappPageUrl(),
      `window.ethereum.request(${request})`,
    );
  }

  async tapApproveButton(): Promise<void> {
    await Gestures.waitAndTap(this.approveButtonText, {
      elemDescription: 'Approve Button',
    });
  }

  async tapSendFailingTransactionButton(): Promise<void> {
    await Gestures.waitAndTap(this.sendFailingTransactionButton, {
      elemDescription: 'Send failing transaction button',
    });
  }

  async tapERC1155BatchTransferButton(): Promise<void> {
    await Gestures.waitAndTap(this.erc1155BatchTransferButton, {
      elemDescription: 'ERC1155 batch transfer button',
    });
  }

  async tapButton(
    elementId: WebElement,
    options: TapOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium() && PlatformDetector.isIOS()) {
      await PlaywrightWebMatchers.withWebViewAction(
        testDappPageUrl(),
        async () => {
          await Gestures.scrollToWebViewPort(elementId);
          await Gestures.tap(elementId, options);
        },
      );
      return;
    }

    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.tap(elementId, options);
  }

  async navigateToTestDappWithContract({
    contractAddress,
  }: ContractNavigationParams): Promise<void> {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${getDappUrl(0)}/?scrollTo=''&contract=${contractAddress}`,
    );
  }

  async switchChainFromTestDapp(): Promise<void> {
    await this.tapButton(this.switchChainFromTestDappButton, {
      elemDescription: 'Switch Chain from Test Dapp',
    });
  }

  async tapSendEIP1559Button(): Promise<void> {
    await this.tapButton(this.sendEIP1559Button, {
      elemDescription: 'Send EIP1559 Transaction Button',
    });
  }

  async tapDeployContractButton(): Promise<void> {
    await this.tapButton(this.deployContractButton, {
      elemDescription: 'Deploy Contract Button',
    });
  }

  async tapSendCallsButton(): Promise<void> {
    await this.tapButton(this.sendCallsButton, {
      elemDescription: 'Send Calls Button',
    });
  }

  async tapRevokeAccountPermission(): Promise<void> {
    await this.tapButton(this.revokeAccountPermission, {
      elemDescription: 'Revoke Account Permission Button',
    });
  }

  async tapERC721RevokeApprovalButton(): Promise<void> {
    await this.tapButton(this.erc721RevokeApprovalButton, {
      elemDescription: 'ERC721 Revoke Approval Button',
    });
  }

  async tapERC1155RevokeApprovalButton(): Promise<void> {
    await this.tapButton(this.erc1155RevokeApprovalButton, {
      elemDescription: 'ERC1155 Revoke Approval Button',
    });
  }

  async tapOpenNetworkPicker(): Promise<void> {
    if (FrameworkDetector.isAppium() && PlatformDetector.isAndroid()) {
      const picker = await PlaywrightMatchers.getElementById(
        TestDappSelectorsWebIDs.OPEN_NETWORK_PICKER,
      );
      const webview = await PlaywrightMatchers.getElementById(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      );
      await PlaywrightGestures.scrollIntoView(picker, {
        scrollableElement: webview,
        scrollParams: { direction: 'up' },
        maxScrolls: 40,
      });
      await PlaywrightGestures.tap(picker);
      return;
    }

    await this.tapButton(this.openNetworkPicker, {
      elemDescription: 'Open Network Picker Button',
    });
  }

  async tapNetworkByName(
    networkName: string,
    { exactMatch = false }: { exactMatch?: boolean } = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      // Honor exactMatch on both platforms (e.g. Sepolia vs Linea Sepolia).
      const networkItem = await PlaywrightMatchers.getElementByText(
        networkName,
        exactMatch,
      );
      const webview = await PlaywrightMatchers.getElementById(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      );
      await PlaywrightGestures.scrollIntoView(networkItem, {
        scrollableElement: webview,
        scrollParams: { direction: 'up' },
        maxScrolls: 20,
      });
      await PlaywrightGestures.tap(networkItem);
      return;
    }

    await this.tapButton(
      this.getNetworkItemByName(networkName, { exactMatch }),
      {
        elemDescription: `tap ${networkName} network`,
      },
    );
  }
}

export default new TestDApp();
