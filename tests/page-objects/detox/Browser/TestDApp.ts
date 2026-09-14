import Matchers from '../../../framework/detox/Matchers';
import Gestures from '../../../framework/detox/Gestures';
import { TestDappSelectorsWebIDs } from '../../../selectors/Browser/TestDapp.selectors';
import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';

/**
 * Detox-native page object for the Test Dapp WebView.
 *
 * Detox-world twin of the Appium `tests/page-objects/Browser/TestDApp.ts`:
 * elements are resolved through the Detox web-element API
 * (`Matchers.getElementByWebID` → `web(by.id(...))`) instead of the Appium
 * driver, which is not available under Detox.
 */
class TestDApp {
  get testDappFoxLogo(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.TEST_DAPP_FOX_LOGO,
    );
  }

  get testDappPageTitle(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.TEST_DAPP_HEADING_TITLE,
    );
  }

  get DappConnectButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.CONNECT_BUTTON,
    );
  }

  get personalSignButton(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.PERSONAL_SIGN,
    );
  }

  get signTypedDataV4Button(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SIGN_TYPE_DATA_V4,
    );
  }

  get sendEIP1559Button(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestDappSelectorsWebIDs.SEND_EIP_1559_BUTTON_ID,
    );
  }

  async tapPersonalSignButton(): Promise<void> {
    await Gestures.waitAndTap(this.personalSignButton, {
      elemDescription: 'Personal sign button',
    });
  }

  async tapTypedV4SignButton(): Promise<void> {
    await Gestures.waitAndTap(this.signTypedDataV4Button, {
      elemDescription: 'Typed V4 sign button',
    });
  }

  /**
   * Taps the "Send EIP-1559 Transaction" button.
   * The button may sit below the fold in the WebView, so it is scrolled into
   * view first. `scrollToView` is not supported by every WebView version, so
   * failures fall back to a plain tap (the tap itself waits for the element
   * to exist via Gestures).
   */
  async tapSendEIP1559Button(): Promise<void> {
    const button = this.sendEIP1559Button;
    try {
      const element = (await button) as IndexableWebElement;
      await element.scrollToView();
    } catch {
      // scrollToView unsupported in this WebView — fall back to a plain tap.
    }
    await Gestures.waitAndTap(button, {
      elemDescription: 'Send EIP1559 Transaction Button',
    });
  }

  async connect(): Promise<void> {
    await Gestures.waitAndTap(this.DappConnectButton, {
      elemDescription: 'Dapp connect button',
    });
  }
}

export default new TestDApp();
