/* eslint-disable @typescript-eslint/no-explicit-any */
import Browser from './BrowserView';
import Matchers from '../../utils/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import {
  TestSnapViewSelectorWebIDS,
  TestSnapInputSelectorWebIDS,
  TestSnapResultSelectorWebIDS,
  TestSnapBottomSheetSelectorWebIDS,
  EntropyDropDownSelectorWebIDS,
} from '../../selectors/Browser/TestSnaps.selectors';
import Gestures from '../../utils/Gestures';
import {
  SNAP_INSTALL_CONNECT,
} from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapConnectionRequest/InstallSnapConnectionRequest.constants';
import {
  SNAP_INSTALL_PERMISSIONS_REQUEST,
  SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE,
} from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapPermissionsRequest/InstallSnapPermissionsRequest.constants';
import { SNAP_INSTALL_OK } from '../../../app/components/Approvals/InstallSnapApproval/InstallSnapApproval.constants';
import TestHelpers from '../../helpers';

export const TEST_SNAPS_URL = 'https://metamask.github.io/snaps/test-snaps/2.23.1/';

class TestSnaps {
  get container() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
  }

  // Only the getters that are actually used
  get getConnectBip44Button() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.BIP_44_BUTTON_ID,
    );
  }

  get getPublicKeyBip44Button() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.PUBLIC_KEY_BIP44_BUTTON_ID,
    );
  }

  get getSignBip44MessageButton() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS.SIGN_BIP44_MESSAGE_BUTTON_ID,
    );
  }

  get getMessageBip44Input() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS.MESSAGE_BIP44_INPUT_ID,
    );
  }

  get getEntropyDropDown() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      EntropyDropDownSelectorWebIDS.SNAP44_ENTROPY_DROP_DOWN,
    );
  }

  get getBip44ResultSpan() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS.BIP44_RESULT_SPAN_ID,
    );
  }

  get getConnectSnapButton() {
    return Matchers.getElementByID(SNAP_INSTALL_CONNECT);
  }

  get getConnectSnapPermissionsRequestButton() {
    return Matchers.getElementByID(SNAP_INSTALL_PERMISSIONS_REQUEST);
  }

  get getApproveSnapPermissionsRequestButton() {
    return Matchers.getElementByID(SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE);
  }

  get getConnectSnapInstallOkButton() {
    return Matchers.getElementByID(SNAP_INSTALL_OK);
  }

  get getApproveSignRequestButton() {
    return Matchers.getElementByID(
      TestSnapBottomSheetSelectorWebIDS.BOTTOMSHEET_FOOTER_BUTTON_ID,
    );
  }

  get getSignBip44MessageResultSpan() {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS.BIP44_SIGN_RESULT_SPAN_ID,
    );
  }

  // Only the methods that are actually used
  async getBip44ResultText() {
    const webElement = await this.getBip44ResultSpan;
    return await (webElement as any).getText();
  }

  async getSignBip44MessageResultText() {
    const webElement = await this.getSignBip44MessageResultSpan;
    return await (webElement as any).getText();
  }

  async typeSignMessage(message: any) {
    await Gestures.typeInWebElement(this.getMessageBip44Input as any, message);
  }

  async navigateToTestSnap() {
    await Browser.navigateToURL(TEST_SNAPS_URL);
  }

  async tapButton(elementId: any) {
    await Gestures.scrollToWebViewPort(elementId);
    await TestHelpers.delay(1000);
    await Gestures.tapWebElement(elementId);
  }

  async tapEntropyDropDown() {
    await this.tapButton(this.getEntropyDropDown);
  }

  async tapInvalidEntropySource() {
    await this.selectEntropySource('invalid', EntropyDropDownSelectorWebIDS.SNAP44_ENTROPY_DROP_DOWN as any);
  }

  async tapValidEntropySource() {
    await this.selectEntropySource('01JYCMT5Q344VAE9XDVH98WH1W', EntropyDropDownSelectorWebIDS.SNAP44_ENTROPY_DROP_DOWN as any);
  }

  async getOptionValueByText(selectorID: any, text: string) {
    const webview = Matchers.getWebViewByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
    return await webview.element(by.web.id(selectorID)).runScript((el, searchText) => {
      if (!el?.options) return null;
      const option = Array.from(el.options).find((opt: any) => opt.text.includes(searchText));
      return option ? (option as any).value : null;
    }, [text]);
  }

  async selectPrimaryEntropySource() {
    const primaryValue = await this.getOptionValueByText(
      EntropyDropDownSelectorWebIDS.SNAP44_ENTROPY_DROP_DOWN,
      '(primary)'
    );
    if (primaryValue) {
      await this.selectEntropySource(primaryValue, EntropyDropDownSelectorWebIDS.SNAP44_ENTROPY_DROP_DOWN);
    } else {
      throw new Error('Primary option not found in entropy dropdown');
    }
  }

  async selectEntropySource(entropySource: string, selectorID: any) {
    const webview = Matchers.getWebViewByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
    await webview.element(by.web.id(selectorID)).runScript(
      (el, value) => {
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      [entropySource]
    );
  }

  async connectToSnap() {
    await Gestures.waitAndTap(this.getConnectSnapButton, {
      skipVisibilityCheck: true,
      delayBeforeTap: 2500,
    });
  }

  async connectToSnapPermissionsRequest() {
    await Gestures.waitAndTap(this.getConnectSnapPermissionsRequestButton, {
      delayBeforeTap: 2500,
    });
  }

  async approveSnapPermissionsRequest() {
    await Gestures.waitAndTap(this.getApproveSnapPermissionsRequestButton, {
      delayBeforeTap: 2500,
    });
  }

  async connectToSnapInstallOk() {
    await Gestures.waitAndTap(this.getConnectSnapInstallOkButton, {
      delayBeforeTap: 2500,
    });
  }

  async swipeUpSmall() {
    await Gestures.swipe(this.container as any, 'up', 'slow', 0.2);
  }

  async tapPublicKeyBip44Button() {
    await this.tapButton(this.getPublicKeyBip44Button);
  }

  async tapSignBip44MessageButton() {
    await this.tapButton(this.getSignBip44MessageButton);
  }

  async approveSignRequest() {
    await Gestures.waitAndTap(this.getApproveSignRequestButton);
  }

  async connectToBip44Snap() {
    await this.tapButton(this.getConnectBip44Button);
  }
}

export default new TestSnaps();
