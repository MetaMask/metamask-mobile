import enContent from '../../../locales/languages/en.json';

import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import TestHelpers from '../../helpers';
import { getLocalTestDappUrl } from '../../fixtures/utils';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { TestDappSelectorsWebIDs } from '../../selectors/Browser/TestDapp.selectors';
import Browser from '../Browser/BrowserView';
import { TapOptions } from '../../framework';

const CONFIRM_BUTTON_TEXT = enContent.confirmation_modal.confirm_cta;
const APPROVE_BUTTON_TEXT = enContent.transactions.tx_review_approve;
const CONNECT_BUTTON_TEXT = 'Connect';

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

  async connect(): Promise<void> {
    await this.tapButton(this.DappConnectButton, {
      elemDescription: 'Connect Button',
    });
  }

  async tapApproveERC20TokensButton(): Promise<void> {
    await this.tapButton(this.ApproveERC20TokensButton, {
      elemDescription: 'Approve ERC20 Tokens Button',
    });
  }

  async tapApproveERC721TokenButton(): Promise<void> {
    await this.tapButton(this.ApproveERC721TokenButton, {
      elemDescription: 'Approve ERC721 Token Button',
    });
  }

  async tapInvalidSigButton(): Promise<void> {
    await this.tapButton(this.invalidSignature, {
      elemDescription: 'Invalid Signature Button',
    });
  }

  async tapIncreaseAllowanceButton(): Promise<void> {
    await this.tapButton(this.increaseAllowanceButton, {
      elemDescription: 'Increase Allowance Button',
    });
  }

  async tapAddERC20TokenToWalletButton(): Promise<void> {
    await this.tapButton(this.addTokensToWalletButton, {
      elemDescription: 'Add ERC20 Token to Wallet Button',
    });
  }

  async tapPersonalSignButton(): Promise<void> {
    await this.tapButton(this.personalSignButton, {
      elemDescription: 'Personal Sign Button',
    });
  }

  async tapTypedSignButton(): Promise<void> {
    await this.tapButton(this.signTypedDataButton, {
      elemDescription: 'Typed Sign Button',
    });
  }

  async tapTypedV3SignButton(): Promise<void> {
    await this.tapButton(this.signTypedDataV3Button, {
      elemDescription: 'Typed V3 Sign Button',
    });
  }

  async tapTypedV4SignButton(): Promise<void> {
    await this.tapButton(this.signTypedDataV4Button, {
      elemDescription: 'Typed V4 Sign Button',
    });
  }

  async tapEthereumSignButton(): Promise<void> {
    await this.tapButton(this.ethereumSignButton, {
      elemDescription: 'Ethereum Sign Button',
    });
  }

  async tapPermitSignButton(): Promise<void> {
    await this.tapButton(this.permitSignButton, {
      elemDescription: 'Permit Sign Button',
    });
  }

  async tapSIWEBadDomainButton(): Promise<void> {
    await this.tapButton(this.siweBadDomainButton, {
      elemDescription: 'SIWE Bad Domain Button',
    });
  }

  async tapERC20TransferButton(): Promise<void> {
    await this.tapButton(this.erc20TransferTokensButton, {
      elemDescription: 'ERC20 Transfer Button',
    });
  }

  async tapNFTTransferButton(): Promise<void> {
    await this.tapButton(this.nftTransferFromTokensButton, {
      elemDescription: 'NFT Transfer Button',
    });
  }

  async tapERC721MintButton(): Promise<void> {
    await this.tapButton(this.erc721MintButton, {
      elemDescription: 'ERC721 Mint Button',
    });
  }

  async tapNFTSetApprovalForAllButton(): Promise<void> {
    await this.tapButton(this.nftSetApprovalForAllButton, {
      elemDescription: 'NFT Set Approval for All Button',
    });
  }

  async tapERC1155SetApprovalForAllButton(): Promise<void> {
    await this.tapButton(this.erc1155SetApprovalForAllButton, {
      elemDescription: 'ERC1155 Set Approval for All Button',
    });
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButtonText, {
      elemDescription: 'Confirm Button',
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
    await this.tapButton(this.sendFailingTransactionButton, {
      elemDescription: 'Send Failing Transaction Button',
    });
  }

  async tapERC1155BatchTransferButton(): Promise<void> {
    await this.tapButton(this.erc1155BatchTransferButton, {
      elemDescription: 'ERC1155 Batch Transfer Button',
    });
  }

  async tapButton(
    elementId: WebElement,
    options: TapOptions = {},
  ): Promise<void> {
    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.waitAndTap(elementId, options);
  }

  async navigateToTestDappWithContract({
    contractAddress,
  }: ContractNavigationParams): Promise<void> {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${getLocalTestDappUrl()}?scrollTo=''&contract=${contractAddress}`,
    );
    // eslint-disable-next-line no-restricted-syntax
    await TestHelpers.delay(3000); // should have a better assertion that waits until the webpage loads
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
}

export default new TestDApp();
