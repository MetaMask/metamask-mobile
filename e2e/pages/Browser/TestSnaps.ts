/* eslint-disable @typescript-eslint/no-explicit-any */
import Browser from './BrowserView';
import Matchers from '../../framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import {
  TestSnapViewSelectorWebIDS,
  TestSnapInputSelectorWebIDS,
  TestSnapResultSelectorWebIDS,
  TestSnapBottomSheetSelectorWebIDS,
  EntropyDropDownSelectorWebIDS,
  NativeDropdownSelectorWebIDS,
} from '../../selectors/Browser/TestSnaps.selectors';
import Gestures from '../../framework/Gestures';
import { SNAP_INSTALL_CONNECT } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapConnectionRequest/InstallSnapConnectionRequest.constants';
import { SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapPermissionsRequest/InstallSnapPermissionsRequest.constants';
import { SNAP_INSTALL_OK } from '../../../app/components/Approvals/InstallSnapApproval/InstallSnapApproval.constants';
import TestHelpers from '../../helpers';
import Assertions from '../../framework/Assertions';
import { IndexableWebElement } from 'detox/detox';
import Utilities from '../../framework/Utilities';
import LegacyGestures from '../../utils/Gestures';
import { ConfirmationFooterSelectorIDs } from '../../selectors/Confirmation/ConfirmationView.selectors';
import { waitForTestSnapsToLoad } from '../../viewHelper';
import { RetryOptions } from '../../framework';
import { Json } from '@metamask/utils';

export const TEST_SNAPS_URL =
  'https://metamask.github.io/snaps/test-snaps/2.28.1/';

class TestSnaps {
  get getConnectSnapButton(): DetoxElement {
    return Matchers.getElementByID(SNAP_INSTALL_CONNECT);
  }

  get getApproveSnapPermissionsRequestButton(): DetoxElement {
    return Matchers.getElementByID(SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE);
  }

  get getConnectSnapInstallOkButton(): DetoxElement {
    return Matchers.getElementByID(SNAP_INSTALL_OK);
  }

  get getApproveSignRequestButton(): DetoxElement {
    return Matchers.getElementByID(
      TestSnapBottomSheetSelectorWebIDS.BOTTOMSHEET_FOOTER_BUTTON_ID,
    );
  }

  get confirmSignatureButton(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
  }

  get footerButton(): DetoxElement {
    return Matchers.getElementByID(
      TestSnapBottomSheetSelectorWebIDS.DEFAULT_FOOTER_BUTTON_ID,
    );
  }

  get checkboxElement(): DetoxElement {
    return Matchers.getElementByID('snap-ui-renderer__checkbox');
  }

  async checkResultSpan(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    expectedMessage: string,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    const webElement = await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS[selector],
    );

    return await Utilities.executeWithRetry(async () => {
      const actualText = await webElement.getText();
      await Assertions.checkIfTextMatches(actualText, expectedMessage);
    }, options);
  }

  async checkInstalledSnaps(
    expectedMessage: string,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    return await this.checkResultSpan(
      'installedSnapResultSpan',
      expectedMessage,
      options,
    );
  }

  async checkResultJson(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    expectedJson: Json,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    const webElement = await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS[selector],
    );

    return await Utilities.executeWithRetry(async () => {
      const actualText = await webElement.getText();
      let actualJson: Json;
      try {
        actualJson = JSON.parse(actualText);
      } catch (error) {
        throw new Error(`Failed to parse JSON from result span: ${actualText}`);
      }

      await Assertions.checkIfJsonEqual(actualJson, expectedJson);
    }, options);
  }

  async checkResultSpanIncludes(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    expectedMessage: string,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    const webElement = await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS[selector],
    );

    return await Utilities.executeWithRetry(async () => {
      const actualText = await webElement.getText();
      if (!actualText.includes(expectedMessage)) {
        throw new Error(`Text did not contain "${expectedMessage}"`);
      }
    }, options);
  }

  async checkResultSpanNotEmpty(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    const webElement = await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS[selector],
    );

    return await Utilities.executeWithRetry(async () => {
      const actualText = await webElement.getText();
      if (!actualText || actualText.trim() === '') {
        throw new Error(`Result span is empty`);
      }
    }, options);
  }

  async navigateToTestSnap(): Promise<void> {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(TEST_SNAPS_URL);
    await waitForTestSnapsToLoad();
  }

  async tapButton(
    buttonLocator: keyof typeof TestSnapViewSelectorWebIDS,
  ): Promise<void> {
    const webElement = Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS[buttonLocator],
    );
    await Gestures.scrollToWebViewPort(webElement);
    await Gestures.tapWebElement(webElement);
  }

  async tapOkButton() {
    const button = Matchers.getElementByText('OK');
    await Gestures.waitAndTap(button);
  }

  async tapApproveButton() {
    const button = Matchers.getElementByText('Approve');
    await Gestures.waitAndTap(button);
  }

  async tapConfirmButton() {
    const button = Matchers.getElementByText('Confirm');
    await Gestures.waitAndTap(button);
  }

  async tapCancelButton() {
    const button = Matchers.getElementByText('Cancel');
    await Gestures.waitAndTap(button);
  }

  async tapFooterButton() {
    await Gestures.waitAndTap(this.footerButton);
  }

  async tapSubmitButton() {
    const button = Matchers.getElementByText('Submit');
    await Gestures.waitAndTap(button);
  }

  async dismissAlert() {
    // Matches the native WebView alert on each platform
    const button = Matchers.getElementByText(
      device.getPlatform() === 'ios' ? 'Ok' : 'OK',
    );
    await Gestures.tap(button);
  }

  async getOptionValueByText(
    webElement: IndexableWebElement,
    text: string,
  ): Promise<string | null> {
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
  ): Promise<void> {
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

  async fillInput(name: string, text: string) {
    const input = Matchers.getElementByID(`${name}-snap-ui-input`);

    await Gestures.typeText(input, text, { hideKeyboard: true });
  }

  async selectInNativeDropdown(
    selector: keyof typeof NativeDropdownSelectorWebIDS,
    text: string,
  ): Promise<void> {
    const dropdown = Matchers.getElementByID(
      NativeDropdownSelectorWebIDS[selector],
    );

    await Gestures.tap(dropdown);

    const selectorItem = element(
      by.text(text).withAncestor(by.id('snap-ui-renderer__selector-item')),
    ) as unknown as DetoxElement;
    await Gestures.tap(selectorItem);
  }

  async selectRadioButton(text: string) {
    const radioButton = element(
      by.text(text).withAncestor(by.id('snap-ui-renderer__radio-button')),
    ) as unknown as DetoxElement;
    await Gestures.tap(radioButton);
  }

  async tapCheckbox() {
    await Gestures.tap(this.checkboxElement);
  }

  async installSnap(
    buttonLocator: keyof typeof TestSnapViewSelectorWebIDS,
  ): Promise<void> {
    await this.tapButton(buttonLocator);

    await Gestures.tap(this.getConnectSnapButton, {
      elemDescription: 'Connect Snap button',
      waitForElementToDisappear: true,
    });

    await Gestures.tap(this.getApproveSnapPermissionsRequestButton, {
      elemDescription: 'Approve permission for Snap button',
      waitForElementToDisappear: true,
    });

    await Gestures.tap(this.getConnectSnapInstallOkButton, {
      elemDescription: 'OK button',
      waitForElementToDisappear: true,
    });
  }

  async fillMessage(
    locator: keyof typeof TestSnapInputSelectorWebIDS,
    message: string,
  ) {
    const webElement = Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapInputSelectorWebIDS[locator],
    ) as Promise<IndexableWebElement>;
    // New gestures currently don't support web elements
    await LegacyGestures.typeInWebElement(webElement, message);
  }

  async approveSignRequest() {
    await Gestures.tap(this.getApproveSignRequestButton);
  }

  async approveNativeConfirmation() {
    await Gestures.tap(this.confirmSignatureButton);
  }

  async waitForWebSocketUpdate(state: {
    open: boolean;
    origin: string | null;
    blockNumber: string | null;
  }): Promise<void> {
    const resultElement = (await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS.networkAccessResultSpan,
    )) as IndexableWebElement;

    await Utilities.waitUntil(
      async () => {
        try {
          await this.tapButton('getWebSocketState');

          // eslint-disable-next-line no-restricted-syntax
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
