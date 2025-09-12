import enContent from '../../../locales/languages/en.json';

import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { getTestDappLocalUrl } from '../../framework/fixtures/FixtureUtils';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { TestDappSelectorsWebIDs } from '../../selectors/Browser/TestDapp.selectors';
import Browser from '../Browser/BrowserView';
import { Assertions, TapOptions, Utilities } from '../../framework';

const CONFIRM_BUTTON_TEXT = enContent.confirmation_modal.confirm_cta;
const APPROVE_BUTTON_TEXT = enContent.transactions.tx_review_approve;
const CONNECT_BUTTON_TEXT = 'Connect';
const DAPP_ACCOUNTS_TEXT = 'Accounts:';

interface ContractNavigationParams {
  contractAddress: string;
}

class TestDApp {
  get confirmButtonText(): DetoxElement {
    return Matchers.getElementByText(CONFIRM_BUTTON_TEXT);
  }

  get approveButtonText(): DetoxElement {
    return Matchers.getElementByText(APPROVE_BUTTON_TEXT);
  }

  get DappConnectButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.CONNECT_BUTTON,
    );
  }

  get connectedAccounts(): WebElement {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      `//*[contains(text(),"${DAPP_ACCOUNTS_TEXT}")]`,
    );
  }

  get ApproveERC20TokensButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.APPROVE_ERC_20_TOKENS_BUTTON_ID,
    );
  }

  get ApproveERC721TokenButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.APPROVE_ERC_721_TOKEN_BUTTON_ID,
    );
  }

  get invalidSignature(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      'signInvalidType',
    );
  }

  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get erc20TransferTokensButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ERC_20_SEND_TOKENS_TRANSFER_TOKENS_BUTTON_ID,
    );
  }

  get increaseAllowanceButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.INCREASE_ALLOWANCE_BUTTON_ID,
    );
  }

  get personalSignButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.PERSONAL_SIGN,
    );
  }

  get signTypedDataButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SIGN_TYPE_DATA,
    );
  }

  get signTypedDataV3Button(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V3,
    );
  }

  get signTypedDataV4Button(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V4,
    );
  }

  get ethereumSignButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ETHEREUM_SIGN,
    );
  }

  get permitSignButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.PERMIT_SIGN,
    );
  }

  get siweBadDomainButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ETHEREUM_SIGN_BAD_DOMAIN,
    );
  }

  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get nftTransferFromTokensButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.NFT_TRANSFER_FROM_BUTTON_ID,
    );
  }

  get nftSetApprovalForAllButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_NFT_BUTTON_ID,
    );
  }

  get addTokensToWalletButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ADD_TOKENS_TO_WALLET_BUTTON,
    );
  }

  get erc1155SetApprovalForAllButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_ERC1155_BUTTON_ID,
    );
  }

  get sendFailingTransactionButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SEND_FAILING_TRANSACTION_BUTTON_ID,
    );
  }

  get erc1155BatchTransferButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.BATCH_TRANSFER_ERC1155_BUTTON_ID,
    );
  }

  get switchChainFromTestDappButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SWITCH_ETHEREUM_CHAIN,
    );
  }

  get testDappFoxLogo(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.TEST_DAPP_FOX_LOGO,
    );
  }

  get testDappPageTitle(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.TEST_DAPP_HEADING_TITLE,
    );
  }

  get erc721MintButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ERC_721_MINT_BUTTON_ID,
    );
  }

  get sendEIP1559Button(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SEND_EIP_1559_BUTTON_ID,
    );
  }

  get deployContractButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.DEPLOY_CONTRACT_BUTTON_ID,
    );
  }

  get sendCallsButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SEND_CALLS_BUTTON,
    );
  }

  get revokeAccountPermission(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.REVOKE_ACCOUNTS_PERMISSIONS,
    );
  }

  get requestPermissions(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.REQUEST_PERMISSIONS,
    );
  }

  get connectButtonText(): WebElement {
    return Matchers.getElementByText(CONNECT_BUTTON_TEXT);
  }

  get erc721RevokeApprovalButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ERC_721_REVOKE_APPROVAL_BUTTON_ID,
    );
  }

  get erc1155RevokeApprovalButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ERC_1155_REVOKE_APPROVAL_BUTTON_ID,
    );
  }

  get openNetworkPicker(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.OPEN_NETWORK_PICKER,
    );
  }

  get networkModalContent(): WebElement {
    return Matchers.getElementByCSS(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      '.network-modal-content',
    );
  }

  getNetworkItemByName(networkName: string): WebElement {
    return Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      `//div[contains(@class, "network-modal-item-name") and contains(text(), "${networkName}")]`,
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

  async tapNetworkCellByLabel(networkLabel: string): Promise<void> {
    const networkCell = await this.getNetworkCellByLabel(networkLabel);
    await Gestures.waitAndTap(networkCell, {
      elemDescription: `Tap on the network cell ${networkLabel}`,
    });
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
    const webview = Matchers.getWebViewByID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    );
    const accountsElement = webview.element(by.web.id(`accounts`));

    const accountsText = await accountsElement
      .runScript('(el) => el.textContent')
      .catch(() => '');

    return typeof accountsText === 'string' ? accountsText : '';
  }

  async getConnectedChainId(): Promise<string> {
    const webview = Matchers.getWebViewByID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    );
    const chainIdElement = webview.element(by.web.id(`chainId`));

    const chainIdText = await chainIdElement
      .runScript('(el) => el.textContent')
      .catch(() => '');

    return typeof chainIdText === 'string' ? chainIdText : '';
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
    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.tap(elementId, options);
  }

  async navigateToTestDappWithContract({
    contractAddress,
  }: ContractNavigationParams): Promise<void> {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${getTestDappLocalUrl()}/?scrollTo=''&contract=${contractAddress}`,
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

  async tapRequestPermissions(): Promise<void> {
    await this.tapButton(this.requestPermissions, {
      elemDescription: 'Request Permissions Button',
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
    await this.tapButton(this.openNetworkPicker, {
      elemDescription: 'Open Network Picker Button',
    });
  }

  async tapNetworkByName(networkName: string): Promise<void> {
    // Try to find the network without scrolling first
    try {
      const networkItem = await this.getNetworkItemByName(networkName);
      await Assertions.expectElementToBeVisible(
        networkItem as unknown as WebElement,
        { timeout: 2000, description: 'network item by label' },
      );
      await Gestures.waitAndTap(networkItem as unknown as WebElement, {
        elemDescription: `tap ${networkName} network`,
      });
      return;
    } catch {
      // Network not visible, need to scroll
    }

    // If not found, scroll the entire webview to find the network
    // const webview = await Matchers.getWebViewByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
    // let attempts = 0;
    // const maxAttempts = 5;

    // while (attempts < maxAttempts) {
    //   try {
    //     // Scroll the webview
    //     await Gestures.swipe(webview as unknown as DetoxElement, 'up', {
    //       speed: 'slow',
    //       percentage: 0.3,
    //     });

    //     // Try to find the network after scrolling using web-specific matcher
    //     const networkItem = await this.getNetworkItemByName(networkName);
    //     await Assertions.expectElementToBeVisible(networkItem as unknown as WebElement, { timeout: 1000 });

    //     await Gestures.waitAndTap(networkItem as unknown as WebElement, {
    //       elemDescription: `tap ${networkName} network`,
    //     });
    //     return;
    //   } catch {
    //     attempts++;
    //   }
    // }

    //  throw new Error(`Could not find network "${networkName}" after scrolling through modal`);
  }
}

export default new TestDApp();
