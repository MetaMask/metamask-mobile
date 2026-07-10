/* eslint-disable @typescript-eslint/no-explicit-any */
import Browser from './BrowserView';
import Matchers from '../../framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import {
  TestSnapViewSelectorWebIDS,
  TestSnapInputSelectorWebIDS,
  TestSnapResultSelectorWebIDS,
  TestSnapBottomSheetSelectorWebIDS,
  EntropyDropDownSelectorWebIDS,
  NativeDropdownSelectorWebIDS,
  TEST_SNAPS_URL,
} from '../../selectors/Browser/TestSnaps.selectors';
import Gestures from '../../framework/Gestures';
import { SNAP_INSTALL_CONNECT } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapConnectionRequest/InstallSnapConnectionRequest.constants';
import { SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapPermissionsRequest/InstallSnapPermissionsRequest.constants';
import { SNAP_INSTALL_OK } from '../../../app/components/Approvals/InstallSnapApproval/InstallSnapApproval.constants';
import TestHelpers from '../../helpers';
import Assertions from '../../framework/Assertions';
import { IndexableWebElement } from 'detox/detox';
import Utilities, { stripJsonKeys } from '../../framework/Utilities';
import { ConfirmationFooterSelectorIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { waitForTestSnapsToLoad } from '../../flows/browser.flow';
import { RetryOptions, EncapsulatedElementType } from '../../framework';
import { FrameworkDetector } from '../../framework/FrameworkDetector';
import { PlatformDetector } from '../../framework/PlatformLocator';
import PlaywrightWebMatchers from '../../framework/PlaywrightWebMatchers';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import {
  assertAndroidTestSnapsClientStatus,
  assertAndroidTestSnapsJson,
  assertAndroidTestSnapsJsonExcluding,
  assertAndroidTestSnapsTextContains,
  fillAndroidTestSnapsInput,
  tapAndroidTestSnapsButton,
} from '../../smoke-appium/snaps/helpers/android-test-snaps-native.helpers';
import { Json } from '@metamask/utils';
import ToastModal from '../wallet/ToastModal';
import SolanaTestDApp from './SolanaTestDApp';

export { TEST_SNAPS_URL } from '../../selectors/Browser/TestSnaps.selectors';

class TestSnaps {
  get getConnectSnapButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SNAP_INSTALL_CONNECT);
  }

  get getApproveSnapPermissionsRequestButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE);
  }

  get getConnectSnapInstallOkButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SNAP_INSTALL_OK);
  }

  get getApproveSignRequestButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      TestSnapBottomSheetSelectorWebIDS.BOTTOMSHEET_FOOTER_BUTTON_ID,
    );
  }

  get confirmSignatureButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
  }

  get solanaConfirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      'confirm-sign-message-confirm-snap-footer-button',
    );
  }

  get footerButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      TestSnapBottomSheetSelectorWebIDS.DEFAULT_FOOTER_BUTTON_ID,
    );
  }

  get checkboxElement(): EncapsulatedElementType {
    return Matchers.getElementByID('snap-ui-renderer__checkbox');
  }

  get dateTimePickerTouchable(): EncapsulatedElementType {
    return Matchers.getElementByID(
      'snap-ui-renderer__date-time-picker--datetime-touchable',
    );
  }

  get datePickerTouchable(): EncapsulatedElementType {
    return Matchers.getElementByID(
      'snap-ui-renderer__date-time-picker--date-touchable',
    );
  }

  get timePickerTouchable(): EncapsulatedElementType {
    return Matchers.getElementByID(
      'snap-ui-renderer__date-time-picker--time-touchable',
    );
  }

  get dateTimePickerOkButton(): EncapsulatedElementType {
    return Matchers.getElementByText('OK');
  }

  get snapUIRendererScrollView(): Promise<Detox.NativeMatcher> {
    return Matchers.getIdentifier('snap-ui-renderer__scrollview');
  }

  private async withWebView(action: () => Promise<void>): Promise<void> {
    if (PlatformDetector.isAndroidAppium()) {
      await PlaywrightContextHelpers.switchToNativeContext();
      await action();
      return;
    }

    if (FrameworkDetector.isAppium()) {
      await PlaywrightWebMatchers.withWebViewAction(TEST_SNAPS_URL, action);
    } else {
      await action();
    }
  }

  private getTestSnapsWebElement(innerID: string) {
    if (FrameworkDetector.isAppium()) {
      return Matchers.getElementByWebID(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        innerID,
        TEST_SNAPS_URL,
      );
    }
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      innerID,
    );
  }

  async checkResultSpan(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    expectedMessage: string,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    if (PlatformDetector.isAndroidAppium()) {
      await assertAndroidTestSnapsTextContains(
        selector,
        expectedMessage,
        options,
      );
      return;
    }

    await this.withWebView(async () => {
      const webElement = await this.getTestSnapsWebElement(
        TestSnapResultSelectorWebIDS[selector],
      );

      return Utilities.executeWithRetry(async () => {
        const actualText = await webElement.getText();
        await Assertions.checkIfTextMatches(actualText, expectedMessage);
      }, options);
    });
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
    if (PlatformDetector.isAndroidAppium()) {
      await assertAndroidTestSnapsJson(selector, expectedJson, options);
      return;
    }

    await this.withWebView(async () => {
      const webElement = await this.getTestSnapsWebElement(
        TestSnapResultSelectorWebIDS[selector],
      );

      return Utilities.executeWithRetry(async () => {
        const actualText = await webElement.getText();
        let actualJson: Json;
        try {
          actualJson = JSON.parse(actualText);
        } catch (error) {
          throw new Error(
            `Failed to parse JSON from result span: ${actualText}`,
          );
        }

        if (
          FrameworkDetector.isAppium() &&
          typeof expectedJson === 'object' &&
          expectedJson !== null &&
          !Array.isArray(expectedJson)
        ) {
          await Assertions.checkIfObjectContains(
            actualJson as Record<string, unknown>,
            expectedJson as Record<string, unknown>,
          );
        } else {
          await Assertions.checkIfJsonEqual(actualJson, expectedJson);
        }
      }, options);
    });
  }

  async checkResultJsonExcluding(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    excludedKeys: string[],
    expectedJson: Json,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    if (PlatformDetector.isAndroidAppium()) {
      await assertAndroidTestSnapsJsonExcluding(
        selector,
        excludedKeys,
        expectedJson,
        options,
      );
      return;
    }

    await this.withWebView(async () => {
      const webElement = await this.getTestSnapsWebElement(
        TestSnapResultSelectorWebIDS[selector],
      );

      return Utilities.executeWithRetry(async () => {
        const actualText = await webElement.getText();
        let actualJson: Json;
        try {
          actualJson = JSON.parse(actualText);
        } catch (error) {
          throw new Error(
            `Failed to parse JSON from result span: ${actualText}`,
          );
        }

        await Assertions.checkIfJsonEqual(
          stripJsonKeys(actualJson, excludedKeys),
          stripJsonKeys(expectedJson, excludedKeys),
        );
      }, options);
    });
  }

  async checkResultSpanIncludes(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    expectedMessage: string,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    await this.withWebView(async () => {
      const webElement = await this.getTestSnapsWebElement(
        TestSnapResultSelectorWebIDS[selector],
      );

      return Utilities.executeWithRetry(async () => {
        const actualText = await webElement.getText();
        if (!actualText.includes(expectedMessage)) {
          throw new Error(`Text did not contain "${expectedMessage}"`);
        }
      }, options);
    });
  }

  async checkResultSpanNotEmpty(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    await this.withWebView(async () => {
      const webElement = await this.getTestSnapsWebElement(
        TestSnapResultSelectorWebIDS[selector],
      );

      return Utilities.executeWithRetry(async () => {
        const actualText = await webElement.getText();
        if (!actualText || actualText.trim() === '') {
          throw new Error(`Result span is empty`);
        }
      }, options);
    });
  }

  async checkClientStatus(
    {
      clientVersion: expectedClientVersion,
      ...expectedStatus
    }: Record<string, Json>,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ) {
    if (PlatformDetector.isAndroidAppium()) {
      await assertAndroidTestSnapsClientStatus(
        {
          clientVersion: expectedClientVersion,
          ...expectedStatus,
        },
        options,
      );
      return;
    }

    await this.withWebView(async () => {
      const webElement = await this.getTestSnapsWebElement(
        TestSnapResultSelectorWebIDS.clientStatusResultSpan,
      );

      return Utilities.executeWithRetry(async () => {
        const actualText = await webElement.getText();
        let actualStatusWithVersion;
        try {
          actualStatusWithVersion = JSON.parse(actualText);
        } catch (error) {
          throw new Error(
            `Failed to parse JSON from client status span: ${actualText}`,
          );
        }

        const { clientVersion: actualClientVersion, ...actualStatus } =
          actualStatusWithVersion;

        await Assertions.checkIfJsonEqual(actualStatus, expectedStatus);
        if (!actualClientVersion.startsWith(expectedClientVersion)) {
          throw new Error(
            `Client version mismatch: Expected version to start with "${expectedClientVersion}", got "${actualClientVersion}".`,
          );
        }
      }, options);
    });
  }

  async navigateToTestSnap(
    options: { skipTabCleanup?: boolean } = {},
  ): Promise<void> {
    if (PlatformDetector.isAndroidAppium() && !options.skipTabCleanup) {
      await Browser.closeAllBrowserTabsIfOpen();
    }

    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(TEST_SNAPS_URL);
    await waitForTestSnapsToLoad();
  }

  async tapButton(
    buttonLocator: keyof typeof TestSnapViewSelectorWebIDS,
  ): Promise<void> {
    if (PlatformDetector.isAndroidAppium()) {
      await tapAndroidTestSnapsButton(buttonLocator);
      return;
    }

    const tap = async () => {
      const webElement = await this.getTestSnapsWebElement(
        TestSnapViewSelectorWebIDS[buttonLocator],
      );
      await Gestures.scrollToWebViewPort(webElement);
      await Gestures.tap(webElement, {
        elemDescription: `tapButton:: ${buttonLocator}`,
      });
    };

    if (FrameworkDetector.isAppium()) {
      await this.withWebView(tap);
      return;
    }

    await tap();
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
    const webElement = (await this.getTestSnapsWebElement(
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

  async selectDateInDateTimePicker() {
    await Gestures.scrollToElement(
      this.timePickerTouchable,
      this.snapUIRendererScrollView,
      {
        startPositionX: 0,
        startPositionY: 0,
      },
    );

    await Gestures.waitAndTap(this.dateTimePickerTouchable, {
      checkStability: true,
      elemDescription: 'open date-time picker',
    });

    await Gestures.waitAndTap(this.dateTimePickerOkButton, {
      elemDescription: 'date-time picker OK',
    });

    // Android date and time picker is a two-step process, so we need to tap OK again
    if (device.getPlatform() === 'android') {
      await Gestures.waitAndTap(this.dateTimePickerOkButton);
    }
  }

  async selectDateInDatePicker() {
    await Gestures.waitAndTap(this.datePickerTouchable, {
      checkStability: true,
      elemDescription: 'open date picker',
    });

    await Gestures.waitAndTap(this.dateTimePickerOkButton, {
      elemDescription: 'date picker OK',
    });
  }

  async selectTimeInTimePicker() {
    await Gestures.waitAndTap(this.timePickerTouchable, {
      checkStability: true,
      elemDescription: 'open time picker',
    });

    await Gestures.waitAndTap(this.dateTimePickerOkButton, {
      elemDescription: 'time picker OK',
    });
  }

  async expectSnapDialogLinkDisplayed(
    options: { timeout?: number } = { timeout: 30_000 },
  ): Promise<void> {
    await Assertions.expectTextDisplayed('Confirmation Dialog', options);

    if (PlatformDetector.isIOSAppium()) {
      // Inline SnapUILink renders as Text on iOS; testIDs are not exposed to XCUITest.
      await Assertions.expectTextDisplayed('link', options);
      return;
    }

    await Assertions.expectElementToBeVisible(
      Matchers.getElementByID('snaps-ui-link-icon'),
      options,
    );
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
    if (PlatformDetector.isAndroidAppium()) {
      await fillAndroidTestSnapsInput(locator, message);
      return;
    }

    await this.withWebView(async () => {
      const webElement = await this.getTestSnapsWebElement(
        TestSnapInputSelectorWebIDS[locator],
      );

      if (FrameworkDetector.isAppium()) {
        const input = await webElement;
        await input.clear();
        await input.fill(message);
        return;
      }

      await Gestures.typeInWebElement(
        webElement as Promise<IndexableWebElement>,
        message,
      );
    });
  }

  async approveSignRequest() {
    await Gestures.tap(this.getApproveSignRequestButton);
  }

  /**
   * Blurs the focused field inside the test-snaps WebView so iOS does not keep the
   * keyboard input accessory (prev/next/done bar) over the native confirmation footer.
   */
  async blurActiveWebViewInput(): Promise<void> {
    const nativeWebView = Matchers.getWebViewByID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
    );
    const bodyElement = nativeWebView.element(by.web.tag('body'));
    await bodyElement.runScript(
      `(el) => {
        var active = document.activeElement;
        if (active && typeof active.blur === 'function') {
          active.blur();
        }
      }`,
    );
  }

  async approveNativeConfirmation() {
    // Network-added toasts can sit above the confirmation footer and steal hit tests.
    await Assertions.expectElementToNotBeVisible(ToastModal.container, {
      description: 'network toast dismissed before confirming snap signature',
      timeout: 15_000,
    });
    await this.blurActiveWebViewInput();
    await Utilities.waitForElementToStopMoving(this.confirmSignatureButton, {
      stableCount: 2,
      timeout: 5_000,
    });
    await Gestures.tap(this.confirmSignatureButton, {
      elemDescription: 'confirm snap signature',
    });
  }

  async approveSolanaConfirmation() {
    await Assertions.expectElementToNotBeVisible(ToastModal.container, {
      description:
        'network toast dismissed before confirming Solana snap signature',
      timeout: 15_000,
    });
    // Multichain Solana signing can use SnapDialog/BottomSheetFooter ("Approve") instead of
    // redesigned `confirm-button` — same as Solana Wallet Standard E2E.
    await SolanaTestDApp.confirmSignMessage();
  }

  async waitForWebSocketUpdate(state: {
    open: boolean;
    origin: string | null;
    blockNumber: string | null;
  }): Promise<void> {
    const resultElement = (await this.getTestSnapsWebElement(
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
