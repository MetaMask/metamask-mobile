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
import { SNAP_INSTALL_CONNECT } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapConnectionRequest/InstallSnapConnectionRequest.constants';
import { SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapPermissionsRequest/InstallSnapPermissionsRequest.constants';
import { SNAP_INSTALL_OK } from '../../../app/components/Approvals/InstallSnapApproval/InstallSnapApproval.constants';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';
import { IndexableWebElement } from 'detox/detox';
import Utilities from '../../utils/Utilities';
import { ConfirmationFooterSelectorIDs } from '../../selectors/Confirmation/ConfirmationView.selectors';

export const TEST_SNAPS_URL =
  'https://metamask.github.io/snaps/test-snaps/2.25.0/';

class TestSnaps {
  get getConnectSnapButton() {
    return Matchers.getElementByID(SNAP_INSTALL_CONNECT);
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

  get confirmSignatureButton() {
    return Matchers.getElementByID(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON);
  }

  async checkResultSpan(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    expectedMessage: string,
  ) {
    const webElement = (await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS[selector],
    )) as IndexableWebElement;

    const actualText = await webElement.getText();
    await Assertions.checkIfTextMatches(actualText, expectedMessage);
  }

  async checkResultSpanIncludes(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    expectedMessage: string,
  ) {
    const webElement = (await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS[selector],
    )) as IndexableWebElement;

    const actualText = await webElement.getText();
    if (!actualText.includes(expectedMessage)) {
      throw new Error(`Text did not contain "${expectedMessage}"`);
    }
  }

  async navigateToTestSnap() {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(TEST_SNAPS_URL);
  }

  async tapButton(buttonLocator: keyof typeof TestSnapViewSelectorWebIDS) {
    const webElement = Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS[buttonLocator],
    ) as any;
    await Gestures.scrollToWebViewPort(webElement);
    await Gestures.tapWebElement(webElement);
  }

  async getOptionValueByText(webElement: IndexableWebElement, text: string) {
    return await webElement.runScript(
      (el, searchText) => {
        if (!el?.options) return null;
        const option = Array.from(el.options).find((opt: any) =>
          opt.text.includes(searchText),
        );
        return option ? (option as any).value : null;
      },
      [text],
    );
  }

  async selectInDropdown(
    selector: keyof typeof EntropyDropDownSelectorWebIDS,
    text: string,
  ) {
    const webElement = (await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      EntropyDropDownSelectorWebIDS[selector],
    )) as IndexableWebElement;

    const source = await this.getOptionValueByText(webElement, text);

    await webElement.runScript(
      (el, value) => {
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
      [source],
    );
  }

  async installSnap(buttonLocator: keyof typeof TestSnapViewSelectorWebIDS) {
    await this.tapButton(buttonLocator);

    await Gestures.waitAndTap(this.getConnectSnapButton);

    await Gestures.waitAndTap(this.getApproveSnapPermissionsRequestButton);

    await Gestures.waitAndTap(this.getConnectSnapInstallOkButton);
  }

  async fillMessage(
    locator: keyof typeof TestSnapInputSelectorWebIDS,
    message: string,
  ) {
    const webElement = Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS[locator],
    ) as Promise<IndexableWebElement>;
    await Gestures.typeInWebElement(webElement, message);
  }

  async approveSignRequest() {
    await Gestures.waitAndTap(this.getApproveSignRequestButton);
  }

  async approveNativeConfirmation() {
    await Gestures.waitAndTap(this.confirmSignatureButton);
  }

  async waitForWebSocketUpdate(state: {
    open: boolean;
    origin: string | null;
    blockNumber: string | null;
  }) {
    const resultElement = (await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS.networkAccessResultSpan,
    )) as IndexableWebElement;

    await Utilities.waitUntil(
      async () => {
        try {
          await this.tapButton('getWebSocketState');

          await TestHelpers.delay(250);

          const text = await resultElement.getText();

          const { open, origin, blockNumber } = JSON.parse(text);

          const blockNumberMatch =
            typeof state.blockNumber === 'string'
              ? typeof blockNumber === state.blockNumber
              : blockNumber === state.blockNumber;

          return (
            open === state.open && origin === state.origin && blockNumberMatch
          );
        } catch (error) {
          return false;
        }
      },
      { timeout: 10000, interval: 1000 },
    );
  }
}

export default new TestSnaps();
