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

  async connect() {
    await this.tapButton(this.DappConnectButton);
  }

  async tapApproveButton() {
    // const myWebView = web(by.id('browser-webview'));

    // const innerElement = myWebView.element(
    //   by.web.id(TestDappSelectorsWebIDs.APPROVE_TOKENS_BUTTON_ID),
    // );
    // await Gestures.scrollToWebViewPort(innerElement);
    // await Gestures.tapWebElement(innerElement);
    await this.tapButton(this.ApproveButton);
  }

  async tapEthSignButton() {
    // const myWebView = web(by.id('browser-webview'));
    // const innerElement = myWebView.element(
    //   by.web.id(TestDappSelectorsWebIDs.ETH_SIGN),
    // );
    // await Gestures.scrollToWebViewPort(innerElement);
    // await Gestures.tapWebElement(innerElement);

    await this.tapButton(this.ethSignButton);
  }

  async tapPersonalSignButton() {
    // const myWebView = web(by.id('browser-webview'));
    // const innerElement = myWebView.element(
    //   by.web.id(TestDappSelectorsWebIDs.PERSONAL_SIGN),
    // );
    // await Gestures.scrollToWebViewPort(innerElement);
    // await Gestures.tapWebElement(innerElement);

    await this.tapButton(this.personalSignButton);
  }

  async tapTypedSignButton() {
    // const myWebView = web(by.id('browser-webview'));
    // const innerElement = myWebView.element(
    //   by.web.id(TestDappSelectorsWebIDs.SIGN_TYPE_DATA),
    // );
    // await Gestures.scrollToWebViewPort(innerElement);
    // await Gestures.tapWebElement(innerElement);

    await this.tapButton(this.signTypedDataButton);
  }

  async tapTypedV3SignButton() {
    // const myWebView = web(by.id('browser-webview'));
    // const innerElement = myWebView.element(
    //   by.web.id(TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V3),
    // );
    // await Gestures.scrollToWebViewPort(innerElement);
    // await Gestures.tapWebElement(innerElement);

    await this.tapButton(this.signTypedDataV3Button);
  }

  async tapTypedV4SignButton() {
    // await Gestures.scrollToWebViewPort(this.signTypedDataV4Button);
    // await Gestures.tapWebElement(this.signTypedDataV4Button);
    await this.tapButton(this.signTypedDataV4Button);
  }
  async tapERC20TransferButton() {
    // const myWebView = web(by.id('browser-webview'));
    // const innerElement = myWebView.element(
    //   by.web.id(
    //     TestDappSelectorsWebIDs.ERC_20_SEND_TOKENS_TRANSFER_TOKENS_BUTTON_ID,
    //   ),
    // );
    // await Gestures.scrollToWebViewPort(innerElement);
    // await Gestures.tapWebElement(innerElement);

    await this.tapButton(this.erc20TransferTokensButton);
  }
  async tapNFTTransferButton() {
    // const myWebView = web(by.id('browser-webview'));
    // const innerElement = myWebView.element(
    //   by.web.id(TestDappSelectorsWebIDs.NFT_TRANSFER_FROM_BUTTON_ID),
    // );
    // await Gestures.scrollToWebViewPort(innerElement);
    // await Gestures.tapWebElement(innerElement);

    await this.tapButton(this.nftTransferFromTokensButton);
  }

  async tapConfirmButton() {
    await Gestures.tap(this.confirmButtonText, 0);
  }

  async tapButton(elementId) {
    await Gestures.scrollToWebViewPort(elementId);
    await Gestures.tapWebElement(elementId);
  }

  async scrollToButtonWithParameter(buttonId, parameterName, parameterValue) {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${TEST_DAPP_LOCAL_URL}?scrollTo=${buttonId}&${parameterName}=${parameterValue}`,
    );
  }

  async scrollToButton(buttonId) {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${TEST_DAPP_LOCAL_URL}?scrollTo=${buttonId}&time=${Date.now()}`,
    );
    await TestHelpers.delay(3000);
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
