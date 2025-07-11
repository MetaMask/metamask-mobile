import TestHelpers from '../../helpers';
import {
  TEST_DAPP_LOCAL_URL,
} from '../../fixtures/utils';

import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { TestDappSelectorsWebIDs } from '../../selectors/Browser/TestDapp.selectors';

import enContent from '../../../locales/languages/en.json';

import Browser from '../Browser/BrowserView';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

const CONFIRM_BUTTON_TEXT = enContent.confirmation_modal.confirm_cta;
const APPROVE_BUTTON_TEXT = enContent.transactions.tx_review_approve;

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
    await this.tapButton(this.DappConnectButton);
  }

  async tapApproveERC20TokensButton(): Promise<void> {
    await this.tapButton(this.ApproveERC20TokensButton);
  }

  async tapApproveERC721TokenButton(): Promise<void> {
    await this.tapButton(this.ApproveERC721TokenButton);
  }

  async tapInvalidSigButton(): Promise<void> {
    await this.tapButton(this.invalidSignature);
  }

  async tapIncreaseAllowanceButton(): Promise<void> {
    await this.tapButton(this.increaseAllowanceButton);
  }

  async tapAddERC20TokenToWalletButton(): Promise<void> {
    await this.tapButton(this.addTokensToWalletButton);
  }

  async tapPersonalSignButton(): Promise<void> {
    await this.tapButton(this.personalSignButton);
  }

  async tapTypedSignButton(): Promise<void> {
    await this.tapButton(this.signTypedDataButton);
  }

  async tapTypedV3SignButton(): Promise<void> {
    await this.tapButton(this.signTypedDataV3Button);
  }

  async tapTypedV4SignButton(): Promise<void> {
    await this.tapButton(this.signTypedDataV4Button);
  }

  async tapEthereumSignButton(): Promise<void> {
    await this.tapButton(this.ethereumSignButton);
  }

  async tapPermitSignButton(): Promise<void> {
    await this.tapButton(this.permitSignButton);
  }

  async tapSIWEBadDomainButton(): Promise<void> {
    await this.tapButton(this.siweBadDomainButton);
  }

  async tapERC20TransferButton(): Promise<void> {
    await this.tapButton(this.erc20TransferTokensButton);
  }

  async tapNFTTransferButton(): Promise<void> {
    await this.tapButton(this.nftTransferFromTokensButton);
  }

  async tabERC721MintButton(): Promise<void> {
    await this.tapButton(this.erc721MintButton);
  }

  async tapNFTSetApprovalForAllButton(): Promise<void> {
    await this.tapButton(this.nftSetApprovalForAllButton);
  }

  async tapERC1155SetApprovalForAllButton(): Promise<void> {
    await this.tapButton(this.erc1155SetApprovalForAllButton);
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButtonText);
  }

  async tapApproveButton(): Promise<void> {
    await Gestures.waitAndTap(this.approveButtonText);
  }

  async tapSendFailingTransactionButton(): Promise<void> {
    await this.tapButton(this.sendFailingTransactionButton);
  }

  async tapERC1155BatchTransferButton(): Promise<void> {
    await this.tapButton(this.erc1155BatchTransferButton);
  }

  async tapButton(elementId: WebElement): Promise<void> {
    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.tapWebElement(elementId);
  }

  async navigateToTestDappWithContract({ contractAddress }: ContractNavigationParams): Promise<void> {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${TEST_DAPP_LOCAL_URL}?scrollTo=''&contract=${contractAddress}`,
    );
    await TestHelpers.delay(3000); // should have a better assertion that waits until the webpage loads
  }

  async switchChainFromTestDapp(): Promise<void> {
    await this.tapButton(this.switchChainFromTestDappButton);
  }

  async tapSendEIP1559Button(): Promise<void> {
    await this.tapButton(this.sendEIP1559Button);
  }

  async tapDeployContractButton() {
    await this.tapButton(this.deployContractButton);
  }

  async tapERC721RevokeApprovalButton(): Promise<void> {
    await this.tapButton(this.erc721RevokeApprovalButton);
  }

  async tapERC1155RevokeApprovalButton(): Promise<void> {
    await this.tapButton(this.erc1155RevokeApprovalButton);
  }
}

export default new TestDApp();
