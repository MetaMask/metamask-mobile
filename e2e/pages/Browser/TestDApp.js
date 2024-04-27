import TestHelpers from '../../helpers';
import { testDappConnectButtonCooridinates } from '../../viewHelper';
import ConnectModal from '../modals/ConnectModal';
import Browser from './Browser';
import root from '../../../locales/languages/en.json';
import { getLocalTestDappPort } from '../../fixtures/utils';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import Assertions from '../../utils/Assertions';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

export const TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;

const BUTTON_RELATIVE_PONT = { x: 200, y: 5 };
const CONFIRM_BUTTON_TEXT = root.confirmation_modal.confirm_cta;

export class TestDApp {
  static async connect() {
    await TestHelpers.tapAtPoint(
      BrowserViewSelectorsIDs.ANDROID_CONTAINER,
      testDappConnectButtonCooridinates,
    ); // should use the web.id to connect: connectButton
    await Assertions.checkIfVisible(ConnectModal.container);
    await ConnectModal.tapConnectButton();
    await TestHelpers.delay(3000);
  }

  static async tapEthSignButton() {
    await this.tapButton('ethSign');
  }

  static async tapPersonalSignButton() {
    await this.tapButton('personalSign');
  }

  static async tapTypedSignButton() {
    await this.tapButton('signTypedData');
  }

  static async tapTypedV3SignButton() {
    await this.tapButton('signTypedDataV3');
  }

  static async tapTypedV4SignButton() {
    await this.tapButton('signTypedDataV4');
  }

  static async tapConfirmButton() {
    await TestHelpers.tapByText(CONFIRM_BUTTON_TEXT, 0);
  }

  static async tapButton(elementId) {
    await this.scrollToButton(elementId);
    const contractButton = Matchers.getElementByWebID(elementId);
    await Gestures.tapWebElement(contractButton);
    await TestHelpers.delay(3000);
  }

  static async scrollToButton(buttonId) {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${TEST_DAPP_LOCAL_URL}?scrollTo=${buttonId}&time=${Date.now()}`,
    );
    await TestHelpers.delay(3000);
  }

  static async scrollToButtonWithParameter(
    buttonId,
    parameterName,
    parameterValue,
  ) {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${TEST_DAPP_LOCAL_URL}?scrollTo=${buttonId}&${parameterName}=${parameterValue}`,
    );
    await TestHelpers.delay(3000);
  }

  static async navigateToTestDappWithContract(contractAddress) {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${TEST_DAPP_LOCAL_URL}?contract=${contractAddress}`,
    );
  }

  static async tapButtonWithContract({ buttonId, contractAddress }) {
    await this.scrollToButtonWithParameter(
      buttonId,
      'contract',
      contractAddress,
    );
    const contractButton = Matchers.getElementByWebID(buttonId);
    await Gestures.tapWebElement(contractButton);
  }
}
