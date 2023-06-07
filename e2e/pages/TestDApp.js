import TestHelpers from '../helpers';
import { testDappConnectButtonCooridinates } from '../viewHelper';
import ConnectModal from './modals/ConnectModal';
import SigningModal from './modals/SigningModal';
import { BROWSER_WEBVIEW_ID } from '../../app/constants/test-ids';

export const TEST_DAPP_URL = 'https://metamask.github.io/test-dapp/';

const ETH_SIGN_BUTTON_RELATIVE_POINT = { x: 200, y: 13 };
const PERSONAL_SIGN_BUTTON_RELATIVE_POINT = { x: 200, y: 107 };
const TYPED_SIGN_BUTTON_RELATIVE_POINT = { x: 200, y: 304 };
const TYPED_V3_SIGN_BUTTON_RELATIVE_POINT = { x: 200, y: 453 };
const TYPED_V4_SIGN_BUTTON_RELATIVE_POINT = { x: 200, y: 600 };

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
    await TestHelpers.tapAtPoint(
      BROWSER_WEBVIEW_ID,
      ETH_SIGN_BUTTON_RELATIVE_POINT,
    );
  }

  static async tapPersonalSignButton() {
    await TestHelpers.tapAtPoint(
      BROWSER_WEBVIEW_ID,
      PERSONAL_SIGN_BUTTON_RELATIVE_POINT,
    );
  }

  static async tapTypedSignButton() {
    await TestHelpers.tapAtPoint(
      BROWSER_WEBVIEW_ID,
      TYPED_SIGN_BUTTON_RELATIVE_POINT,
    );
  }

  static async tapTypedV3SignButton() {
    await TestHelpers.tapAtPoint(
      BROWSER_WEBVIEW_ID,
      TYPED_V3_SIGN_BUTTON_RELATIVE_POINT,
    );
  }

  static async tapTypedV4SignButton() {
    await TestHelpers.tapAtPoint(
      BROWSER_WEBVIEW_ID,
      TYPED_V4_SIGN_BUTTON_RELATIVE_POINT,
    );
  }

  // Temporary until Detox supports webview interaction in iOS
  static async swipeToSignButtons() {
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await TestHelpers.swipe(
          BROWSER_WEBVIEW_ID,
          'up',
          'fast',
          1.0,
          0.5,
          0.99,
        );

        await TestHelpers.swipe(
          BROWSER_WEBVIEW_ID,
          'up',
          'fast',
          0.36,
          0.5,
          0.99,
        );

        await this.tapPersonalSignButton();
        await SigningModal.isPersonalRequestVisible();
        await SigningModal.tapCancelButton();

        await this.tapTypedV4SignButton();
        await SigningModal.isTypedRequestVisible();
        await SigningModal.tapCancelButton();

        return;
      } catch {
        await this.#scrollToTop();
        continue;
      }
    }

    throw new Error('Failed to scroll to sign buttons');
  }

  static async #scrollToTop() {
    await TestHelpers.swipe(BROWSER_WEBVIEW_ID, 'down', 'fast', 1.0, 0.5, 0.01);
    await TestHelpers.swipe(BROWSER_WEBVIEW_ID, 'down', 'fast', 1.0, 0.5, 0.01);
  }
}
