import TestHelpers from '../helpers';
import { testDappConnectButtonCooridinates } from '../viewHelper';
import ConnectModal from './modals/ConnectModal';
import Browser from './Browser';
import root from '../../locales/languages/en.json';
import { getLocalTestDappPort } from '../fixtures/utils';
import { BrowserViewSelectorsIDs } from '../selectors/BrowserView.selectors';
import Assertions from '../utils/Assertions';

export const TEST_DAPP_LOCAL_URL = `http://localhost:${getLocalTestDappPort()}`;

const BUTTON_RELATIVE_PONT = { x: 200, y: 5 };
const CONFIRM_BUTTON_TEXT = root.confirmation_modal.confirm_cta;

export class TestDApp {
  static async connect() {
    await TestHelpers.tapAtPoint(
      BrowserViewSelectorsIDs.ANDROID_CONTAINER,
      testDappConnectButtonCooridinates,
    );
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

  // All the below functions are temporary until Detox supports webview interaction in iOS.

  static async tapButton(elementId) {
    await this.scrollToButton(elementId);
    await TestHelpers.tapAtPoint(
      BrowserViewSelectorsIDs.ANDROID_CONTAINER,
      BUTTON_RELATIVE_PONT,
    );
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

    if (device.getPlatform() === 'android') {
      await TestHelpers.tapAtPoint(
        BrowserViewSelectorsIDs.ANDROID_CONTAINER,
        BUTTON_RELATIVE_PONT,
      );
    } else {
      await TestHelpers.delay(5000);
      await TestHelpers.tapAtPoint(
        BrowserViewSelectorsIDs.ANDROID_CONTAINER,
        BUTTON_RELATIVE_PONT,
      );
    }
  }
}
