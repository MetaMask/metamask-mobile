import TestHelpers from '../../helpers';
import { getLocalTestDappPort } from '../../fixtures/utils';

import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import { TestDappSelectorsWebIDs } from '../../selectors/Browser/TestDapp.selectors';

import enContent from '../../../locales/languages/en.json';

import Browser from '../Browser/BrowserView';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

export const TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;
const CONFIRM_BUTTON_TEXT = enContent.confirmation_modal.confirm_cta;
const APPROVE_BUTTON_TEXT = enContent.transactions.tx_review_approve;

class TestDApp {
  get androidContainer() {
    return BrowserViewSelectorsIDs.ANDROID_CONTAINER;
  }

  get confirmButtonText() {
    return Matchers.getElementByText(CONFIRM_BUTTON_TEXT);
  }

  get approveButtonText() {
    return Matchers.getElementByText(APPROVE_BUTTON_TEXT);
  }

  get DappConnectButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.CONNECT_BUTTON,
    );
  }

  get ApproveERC20TokensButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.APPROVE_ERC_20_TOKENS_BUTTON_ID,
    );
  }
  get invalidSignature() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      'signInvalidType',
    );
  }

  get ApproveERC721TokenButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.APPROVE_ERC_721_TOKEN_BUTTON_ID,
    );
  }
  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get erc20TransferTokensButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ERC_20_SEND_TOKENS_TRANSFER_TOKENS_BUTTON_ID,
    );
  }
  get increaseAllowanceButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.INCREASE_ALLOWANCE_BUTTON_ID,
    );
  }
  get personalSignButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.PERSONAL_SIGN,
    );
  }
  get signTypedDataButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SIGN_TYPE_DATA,
    );
  }
  get signTypedDataV3Button() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V3,
    );
  }
  get signTypedDataV4Button() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V4,
    );
  }
  get ethereumSignButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ETHEREUM_SIGN,
    );
  }
  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get nftTransferFromTokensButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.NFT_TRANSFER_FROM_BUTTON_ID,
    );
  }

  get nftSetApprovalForAllButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_NFT_BUTTON_ID,
    );
  }

  get addTokensToWalletButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ADD_TOKENS_TO_WALLET_BUTTON,
    );
  }

  get erc1155SetApprovalForAllButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_ERC1155_BUTTON_ID,
    );
  }

  get sendFailingTransactionButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SEND_FAILING_TRANSACTION_BUTTON_ID,
    );
  }

  get erc1155BatchTransferButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.BATCH_TRANSFER_ERC1155_BUTTON_ID,
    );
  }

  get switchChainFromTestDappButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SWITCH_ETHEREUM_CHAIN,
    );
  }
  get testDappFoxLogo() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.TEST_DAPP_FOX_LOGO,
    );
  }
  get testDappPageTitle() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.TEST_DAPP_HEADING_TITLE,
    );
  }

  async connect() {
    await this.tapButton(this.DappConnectButton);
  }

  async tapApproveERC20TokensButton() {
    await this.tapButton(this.ApproveERC20TokensButton);
  }

  async tapApproveERC721TokenButton() {
    await this.tapButton(this.ApproveERC721TokenButton);
  }
  async tapInvalidSigButton() {
    await this.tapButton(this.invalidSignature);
  }
  async tapIncreaseAllowanceButton() {
    await this.tapButton(this.increaseAllowanceButton);
  }
  async tapAddERC20TokenToWalletButton() {
    await this.tapButton(this.addTokensToWalletButton);
  }

  async tapPersonalSignButton() {
    await this.tapButton(this.personalSignButton);
  }

  async tapTypedSignButton() {
    await this.tapButton(this.signTypedDataButton);
  }

  async tapTypedV3SignButton() {
    await this.tapButton(this.signTypedDataV3Button);
  }

  async tapTypedV4SignButton() {
    await this.tapButton(this.signTypedDataV4Button);
  }

  async tapEthereumSignButton() {
    await this.tapButton(this.ethereumSignButton);
  }

  async tapERC20TransferButton() {
    await this.tapButton(this.erc20TransferTokensButton);
  }
  async tapNFTTransferButton() {
    await this.tapButton(this.nftTransferFromTokensButton);
  }

  async tapNFTSetApprovalForAllButton() {
    await this.tapButton(this.nftSetApprovalForAllButton);
  }

  async tapERC1155SetApprovalForAllButton() {
    await this.tapButton(this.erc1155SetApprovalForAllButton);
  }

  async tapConfirmButton() {
    await Gestures.tap(this.confirmButtonText, 0);
  }

  async tapApproveButton() {
    await Gestures.tap(this.approveButtonText, 0);
  }

  async tapSendFailingTransactionButton() {
    await this.tapButton(this.sendFailingTransactionButton);
  }

  async tapERC1155BatchTransferButton() {
    await this.tapButton(this.erc1155BatchTransferButton);
  }

  async tapButton(elementId) {
    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.tapWebElement(elementId);
  }

  async navigateToTestDappWithContract({ contractAddress }) {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${TEST_DAPP_LOCAL_URL}?scrollTo=''&contract=${contractAddress}`,
    );
    await TestHelpers.delay(3000); // should have a better assertion that waits until the webpage loads
  }

  async switchChainFromTestDapp() {
    await this.tapButton(this.switchChainFromTestDappButton);
  }
}

export default new TestDApp();
