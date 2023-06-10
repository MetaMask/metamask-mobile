import TestHelpers from '../helpers';
import { testDappConnectButtonCooridinates } from '../viewHelper';
import ConnectModal from './modals/ConnectModal';
import { BROWSER_WEBVIEW_ID } from '../../app/constants/test-ids';
import Browser from './Drawer/Browser';

export const TEST_DAPP_URL = 'https://metamask.github.io/test-dapp/';

const SIGN_BUTTON_RELATIVE_PONT = { x: 200, y: 5 };

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
    await this.#scrollToSignButton('ethSign');
    await this.#tapSignButton();
  }

  static async tapPersonalSignButton() {
    await this.#scrollToSignButton('personalSign');
    await this.#tapSignButton();
  }

  static async tapTypedSignButton() {
    await this.#scrollToSignButton('signTypedData');
    await this.#tapSignButton();
  }

  static async tapTypedV3SignButton() {
    await this.#scrollToSignButton('signTypedDataV3');
    await this.#tapSignButton();
  }

  static async tapTypedV4SignButton() {
    await this.#scrollToSignButton('signTypedDataV4');
    await this.#tapSignButton();
  }

  // All the below functions are temporary until Detox supports webview interaction in iOS.

  static async #scrollToSignButton(buttonId) {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(`${TEST_DAPP_URL}?scrollTo=${buttonId}`);
    await TestHelpers.delay(10000);
  }

  static async #tapSignButton() {
    await TestHelpers.tapAtPoint(BROWSER_WEBVIEW_ID, SIGN_BUTTON_RELATIVE_PONT);
    await TestHelpers.delay(10000);
  }
}
