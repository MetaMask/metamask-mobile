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
import Assertions from '../../utils/Assertions';
import { IndexableWebElement } from 'detox/detox';

export const TEST_SNAPS_URL = 'https://metamask.github.io/snaps/test-snaps/2.23.1/';

class TestSnaps {
  get container() {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID);
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

  async checkResultSpan(selector: keyof typeof TestSnapResultSelectorWebIDS, expectedMessage: string) {
    const webElement = await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS[selector],
    ) as IndexableWebElement;

    const actualText = await webElement.getText();
    await Assertions.checkIfTextMatches(actualText, expectedMessage);
  }

  async navigateToTestSnap() {
    await Browser.navigateToURL(TEST_SNAPS_URL);
  }

  async tapButton(buttonLocator: keyof typeof TestSnapViewSelectorWebIDS) {
    const webElement = Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS[buttonLocator],
    ) as any;
    await Gestures.scrollToWebViewPort(webElement);
    await TestHelpers.delay(1000);
    await Gestures.tapWebElement(webElement);
  }

  async getOptionValueByText(webElement: IndexableWebElement, text: string) {
    return await webElement.runScript((el, searchText) => {
      if (!el?.options) return null;
      const option = Array.from(el.options).find((opt: any) => opt.text.includes(searchText));
      return option ? (option as any).value : null;
    }, [text]);
  }

  async selectEntropySource(selector: keyof typeof EntropyDropDownSelectorWebIDS, entropySource: string) {
    const webElement = await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      EntropyDropDownSelectorWebIDS[selector],
    ) as IndexableWebElement;

    const source = await this.getOptionValueByText(webElement, entropySource);

    await webElement.runScript(
      (el, value) => {
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      [source]
    );
  }

  async installSnap(buttonLocator: keyof typeof TestSnapViewSelectorWebIDS) {
    await this.tapButton(buttonLocator);

    await Gestures.waitAndTap(this.getConnectSnapButton, {
      skipVisibilityCheck: true,
      delayBeforeTap: 2500,
    });

    await Gestures.waitAndTap(this.getConnectSnapPermissionsRequestButton, {
      delayBeforeTap: 2500,
    });

    await Gestures.waitAndTap(this.getApproveSnapPermissionsRequestButton, {
      delayBeforeTap: 2500,
    });

    await Gestures.waitAndTap(this.getConnectSnapInstallOkButton, {
      delayBeforeTap: 2500,
    });
  }

  async fillMessage(locator: keyof typeof TestSnapInputSelectorWebIDS, message: string) {
    const webElement = Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS[locator],
    ) as Promise<IndexableWebElement>;
    await Gestures.typeInWebElement(webElement, message);
  }

  async swipeUpSmall() {
    await Gestures.swipe(this.container as any, 'up', 'slow', 0.2);
  }

  async approveSignRequest() {
    await Gestures.waitAndTap(this.getApproveSignRequestButton);
  }
}

export default new TestSnaps();
