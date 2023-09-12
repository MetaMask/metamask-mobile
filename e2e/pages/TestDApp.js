import TestHelpers from '../helpers';
import { testDappConnectButtonCooridinates } from '../viewHelper';
import ConnectModal from './modals/ConnectModal';
import { BROWSER_WEBVIEW_ID } from '../../app/constants/test-ids';
import Browser from './Drawer/Browser';
import root from '../../locales/languages/en.json';

export const TEST_DAPP_URL = 'https://metamask.github.io/test-dapp/';
export const TEST_DAPP_LOCAL_URL = 'http://localhost:8080';

const BUTTON_RELATIVE_PONT = { x: 200, y: 5 };
const WEBVIEW_TEST_DAPP_TRANSFER_FROM_BUTTON_ID = 'transferFromButton';
const CONFIRM_BUTTON_TEXT = root.confirmation_modal.confirm_cta;

export class TestDApp {
  static async connect() {
    await TestHelpers.tapAtPoint(
      BROWSER_WEBVIEW_ID,
      testDappConnectButtonCooridinates,
    );
    await ConnectModal.isVisible();
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
    await TestHelpers.tapAtPoint(BROWSER_WEBVIEW_ID, BUTTON_RELATIVE_PONT);
    await TestHelpers.delay(3000);
  }

  static async scrollToButton(buttonId, testDappUrl) {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${testDappUrl}?scrollTo=${buttonId}&time=${Date.now()}`,
    );
    await TestHelpers.delay(3000);
  }

  static async scrollToButtonWithParameter(
    buttonId,
    parameterName,
    parameterValue,
    testDappUrl,
  ) {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(
      `${testDappUrl}?scrollTo=${buttonId}&time=${Date.now()}&${parameterName}=${parameterValue}`,
    );
    await TestHelpers.delay(3000);
  }

  static async navigateToTestDappWithContract(testDappUrl, contractAddress) {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(`${testDappUrl}?contract=${contractAddress}`);
  }

  static async tapTransferFromButton(contractAddress, testDappUrl) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitForWebElementToBeVisibleById(
        WEBVIEW_TEST_DAPP_TRANSFER_FROM_BUTTON_ID,
        5000,
      );
      await TestHelpers.tapWebviewElement(
        WEBVIEW_TEST_DAPP_TRANSFER_FROM_BUTTON_ID,
      );
    } else {
      await this.scrollToButtonWithParameter(
        'transferFromButton',
        'contract',
        contractAddress,
        testDappUrl,
      );
      await TestHelpers.tapAtPoint(BROWSER_WEBVIEW_ID, BUTTON_RELATIVE_PONT);
    }
  }
}
