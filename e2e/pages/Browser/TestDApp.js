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

class TestDApp {
  get androidContainer() {
    return BrowserViewSelectorsIDs.ANDROID_CONTAINER;
  }

  get confirmButtonText() {
    return Matchers.getElementByText(CONFIRM_BUTTON_TEXT);
  }

  get DappConnectButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.CONNECT_BUTTON,
    );
  }

  get ApproveButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.APPROVE_TOKENS_BUTTON_ID,
    );
  }
  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get erc20TransferTokensButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ERC_20_SEND_TOKENS_TRANSFER_TOKENS_BUTTON_ID,
    );
  }
  get ethSignButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.ETH_SIGN,
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
      TestDappSelectorsWebIDs.SET_APPROVAL_FOR_ALL_BUTTON_ID,
    );
  }

  async connect() {
    await this.tapButton(this.DappConnectButton);
  }

  async tapApproveButton() {
    await this.tapButton(this.ApproveButton);
  }

  async tapEthSignButton() {
    await this.tapButton(this.ethSignButton);
  }

  async tapIncreaseAllowanceButton() {
    await this.tapButton(this.increaseAllowanceButton);
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
  async tapERC20TransferButton() {
    await this.tapButton(this.erc20TransferTokensButton);
  }
  async tapNFTTransferButton() {
    await this.tapButton(this.nftTransferFromTokensButton);
  }

  async tapNFTSetApprovalForAllButton() {
    await this.tapButton(this.nftSetApprovalForAllButton);
  }

  async tapConfirmButton() {
    await Gestures.waitAndTap(this.confirmButtonText);
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
}

export default new TestDApp();
