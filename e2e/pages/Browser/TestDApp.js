import TestHelpers from '../../helpers';
import { getLocalTestDappPort } from '../../fixtures/utils';

import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';

import enContent from '../../../locales/languages/en.json';

import Browser from '../Browser/BrowserView';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';
import { TestDappSelectorsWebIDs } from '../../selectors/Browser/TestDapp.selectors';

export const TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;
const BUTTON_RELATIVE_PONT = { x: 200, y: 5 };
const CONFIRM_BUTTON_TEXT = enContent.confirmation_modal.confirm_cta;

class TestDApp {
  get androidContainer() {
    return BrowserViewSelectorsIDs.ANDROID_CONTAINER;
  }

  get confirmButtonText() {
    return Matchers.getElementByText(CONFIRM_BUTTON_TEXT);
  }

  get DappConnectButton() {
    return Matchers.getElementByWebID(TestDappSelectorsWebIDs.CONNECT_BUTTON);
  }

  get ApproveButton() {
    return Matchers.getElementByWebID(
      TestDappSelectorsWebIDs.APPROVE_TOKENS_BUTTON_ID,
    );
  }
  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get erc20TransferTokensButton() {
    return Matchers.getElementByWebID(
      TestDappSelectorsWebIDs.ERC_20_SEND_TOKENS_TRANSFER_TOKENS_BUTTON_ID,
    );
  }
  get ethSignButton() {
    return Matchers.getElementByWebID(TestDappSelectorsWebIDs.ETH_SIGN);
  }
  get personalSignButton() {
    return Matchers.getElementByWebID(TestDappSelectorsWebIDs.PERSONAL_SIGN);
  }
  get signTypedDataButton() {
    return Matchers.getElementByWebID(TestDappSelectorsWebIDs.SIGN_TYPE_DATA);
  }
  get signTypedDataV3Button() {
    return Matchers.getElementByWebID(
      TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V3,
    );
  }
  get signTypedDataV4Button() {
    return Matchers.getElementByWebID(
      TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V4,
    );
  }
  // This taps on the transfer tokens button under the "SEND TOKENS section"
  get nftTransferFromTokensButton() {
    return Matchers.getElementByWebID(
      TestDappSelectorsWebIDs.NFT_TRANSFER_FROM_BUTTON_ID,
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
  }

  async tapButtonWithContract({ buttonId, contractAddress }) {
    await this.scrollToButtonWithParameter(
      buttonId,
      'contract',
      contractAddress,
    );
    if (device.getPlatform() === 'android') {
      await TestHelpers.tapAtPoint(this.androidContainer, BUTTON_RELATIVE_PONT);
    } else {
      await TestHelpers.delay(5000);
      await TestHelpers.tapAtPoint(this.androidContainer, BUTTON_RELATIVE_PONT);
    }
  }
}

export default new TestDApp();
