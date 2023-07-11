import TestHelpers from '../helpers';
import { testDappConnectButtonCooridinates } from '../viewHelper';
import ConnectModal from './modals/ConnectModal';
import { BROWSER_WEBVIEW_ID } from '../../app/constants/test-ids';
import Browser from './Drawer/Browser';

export const TEST_DAPP_URL = 'https://metamask.github.io/test-dapp/';

const BUTTON_RELATIVE_PONT = { x: 200, y: 5 };

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

  // All the below functions are temporary until Detox supports webview interaction in iOS.

  static async tapButton(elementId) {
    await this.scrollToButton(elementId);
    await TestHelpers.tapAtPoint(BROWSER_WEBVIEW_ID, BUTTON_RELATIVE_PONT);
    await TestHelpers.delay(3000);
  }

  static async scrollToButton(buttonId) {
    await Browser.tapUrlInputBox();

    await Browser.navigateToURL(
      `${TEST_DAPP_URL}?scrollTo=${buttonId}&time=${Date.now()}`,
    );

    await TestHelpers.delay(3000);
  }
}
