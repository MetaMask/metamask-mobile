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
  testSnapsAndroidScrollOptions,
} from '../../selectors/Browser/TestSnaps.selectors';
import WebView, { type WebViewByIdOptions } from '../../framework/WebView';
import Gestures from '../../framework/Gestures';
import { SNAP_INSTALL_CONNECT } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapConnectionRequest/InstallSnapConnectionRequest.constants';
import { SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapPermissionsRequest/InstallSnapPermissionsRequest.constants';
import { SNAP_INSTALL_OK } from '../../../app/components/Approvals/InstallSnapApproval/InstallSnapApproval.constants';
import TestHelpers from '../../helpers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { ConfirmationFooterSelectorIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { waitForTestSnapsToLoad } from '../../flows/browser.flow';
import {
  RetryOptions,
  EncapsulatedElementType,
  resolve,
  encapsulated,
} from '../../framework';
import { FrameworkDetector } from '../../framework/FrameworkDetector';
import { PlatformDetector } from '../../framework/PlatformLocator';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { Json } from '@metamask/utils';
import ToastModal from '../wallet/ToastModal';
import SolanaTestDApp from './SolanaTestDApp';

export { TEST_SNAPS_URL } from '../../selectors/Browser/TestSnaps.selectors';

const TEST_SNAPS_WEBVIEW_OPTIONS: WebViewByIdOptions = {
  pageUrl: TEST_SNAPS_URL,
  ...testSnapsAndroidScrollOptions,
};
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
    const webId = TestSnapResultSelectorWebIDS[selector];

    await Utilities.executeWithRetry(
      async () => {
        const actualText = await WebView.readTextById(
          webId,
          TEST_SNAPS_WEBVIEW_OPTIONS,
        );

        // Android Appium UiAutomator omits JSON string quotes; Detox/iOS include them
        if (PlatformDetector.isAndroidAppium()) {
          const normalizedExpected = expectedMessage.replace(/^"|"$/g, '');
          if (!actualText.includes(normalizedExpected)) {
            throw new Error(
              `Expected "${webId}" text to contain "${normalizedExpected}", got "${actualText}"`,
            );
          }
          return;
        }

        await Assertions.checkIfTextMatches(actualText, expectedMessage);
      },
      {
        timeout: options.timeout ?? 5_000,
        interval: options.interval ?? 100,
        description: `Assert result "${webId}" matches expected text`,
      },
    );
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
    const webId = TestSnapResultSelectorWebIDS[selector];

    await Utilities.executeWithRetry(
      async () => {
        const actualText = await WebView.readTextById(
          webId,
          TEST_SNAPS_WEBVIEW_OPTIONS,
        );
        await Assertions.checkParsedJsonEqual(
          actualText,
          expectedJson,
          `result span "${selector}"`,
        );
      },
      {
        timeout: options.timeout ?? 5_000,
        interval: options.interval ?? 100,
        description: `Assert JSON result "${webId}"`,
      },
    );
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
    const webId = TestSnapResultSelectorWebIDS[selector];

    await Utilities.executeWithRetry(
      async () => {
        const actualText = await WebView.readTextById(
          webId,
          TEST_SNAPS_WEBVIEW_OPTIONS,
        );
        await Assertions.checkParsedJsonEqualExcluding(
          actualText,
          expectedJson,
          excludedKeys,
          `result span "${selector}"`,
        );
      },
      {
        timeout: options.timeout ?? 5_000,
        interval: options.interval ?? 100,
        description: `Assert JSON result "${webId}" excluding ${excludedKeys.join(', ')}`,
      },
    );
  }

  async checkResultSpanIncludes(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    expectedMessage: string,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    const webId = TestSnapResultSelectorWebIDS[selector];
    // Android Appium UiAutomator omits JSON string quotes; Detox/iOS include them.
    const formattedExpectedMessage = PlatformDetector.isAndroidAppium()
      ? expectedMessage.replace(/^"|"$/g, '')
      : expectedMessage;

    await Utilities.executeWithRetry(
      async () => {
        const actualText = await WebView.readTextById(
          webId,
          TEST_SNAPS_WEBVIEW_OPTIONS,
        );
        if (!actualText.includes(formattedExpectedMessage)) {
          throw new Error(`Text did not contain "${formattedExpectedMessage}"`);
        }
      },
      {
        timeout: options.timeout ?? 5_000,
        interval: options.interval ?? 100,
        description: `Assert result "${webId}" contains "${formattedExpectedMessage}"`,
      },
    );
  }

  async checkResultSpanNotEmpty(
    selector: keyof typeof TestSnapResultSelectorWebIDS,
    options: Partial<RetryOptions> = {
      timeout: 5_000,
      interval: 100,
    },
  ): Promise<void> {
    const webId = TestSnapResultSelectorWebIDS[selector];

    await Utilities.executeWithRetry(
      async () => {
        const actualText = await WebView.readTextById(
          webId,
          TEST_SNAPS_WEBVIEW_OPTIONS,
        );
        if (!actualText || actualText.trim() === '') {
          throw new Error(`Result span is empty`);
        }
      },
      {
        timeout: options.timeout ?? 5_000,
        interval: options.interval ?? 100,
        description: `Assert result "${webId}" is not empty`,
      },
    );
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
    const webId = TestSnapResultSelectorWebIDS.clientStatusResultSpan;

    await Utilities.executeWithRetry(
      async () => {
        const actualText = await WebView.readTextById(
          webId,
          TEST_SNAPS_WEBVIEW_OPTIONS,
        );
        let actualStatusWithVersion;
        try {
          actualStatusWithVersion = JSON.parse(actualText);
        } catch {
          throw new Error(
            `Failed to parse JSON from client status span: ${actualText}`,
          );
        }

        const { clientVersion: actualClientVersion, ...actualStatus } =
          actualStatusWithVersion;

        await Assertions.checkIfJsonEqual(actualStatus, expectedStatus);
        if (
          typeof expectedClientVersion !== 'string' ||
          typeof actualClientVersion !== 'string' ||
          !actualClientVersion.startsWith(expectedClientVersion)
        ) {
          throw new Error(
            `Client version mismatch: Expected version to start with "${String(
              expectedClientVersion,
            )}", got "${String(actualClientVersion)}".`,
          );
        }
      },
      {
        timeout: options.timeout ?? 5_000,
        interval: options.interval ?? 100,
        description: `Assert client status JSON "${webId}"`,
      },
    );
  }

  async navigateToTestSnap(
    options: { skipTabCleanup?: boolean } = {},
  ): Promise<void> {
    // Appium uses dapp:// deeplink for https test-snaps URLs in navigateToURL.
    // Tapping the URL bar first is unnecessary and races with browser chrome.
    if (!FrameworkDetector.isAppium()) {
      await Browser.tapUrlInputBox();
    }
    await Browser.navigateToURL(TEST_SNAPS_URL, {
      closeAllTabsIfOpen: !options.skipTabCleanup,
    });
    await waitForTestSnapsToLoad();
  }

  async tapButton(
    buttonLocator: keyof typeof TestSnapViewSelectorWebIDS,
  ): Promise<void> {
    const webId = TestSnapViewSelectorWebIDS[buttonLocator];
    await WebView.tapById(webId, {
      ...TEST_SNAPS_WEBVIEW_OPTIONS,
      description: `tapButton:: ${buttonLocator}`,
    });
  }

  async tapOkButton() {
    const button = Matchers.getElementByText(/^OK$/i);
    await Gestures.waitAndTap(button);
  }

  async tapApproveButton() {
    const button = Matchers.getElementByText(/^Approve$/i);
    await Gestures.waitAndTap(button);
  }

  async tapConfirmButton() {
    const button = Matchers.getElementByText(/^Confirm$/i);
    await Gestures.waitAndTap(button);
  }

  async tapCancelButton() {
    const button = Matchers.getElementByText(/^Cancel$/i);
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
    try {
      await Gestures.tap(Matchers.getElementByText(/^OK$/i));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/stale|wasn't found|no such element/i.test(message)) {
        throw error;
      }
    }
  }

  async selectInDropdown(
    selector: keyof typeof EntropyDropDownSelectorWebIDS,
    text: string,
  ): Promise<void> {
    await WebView.selectOptionById(
      EntropyDropDownSelectorWebIDS[selector],
      text,
      TEST_SNAPS_WEBVIEW_OPTIONS,
    );
  }

  async fillInput(name: string, text: string) {
    const input = Matchers.getElementByID(`${name}-snap-ui-input`);
    await Gestures.typeText(input, text, { hideKeyboard: true });
  }

  /**
   * Dialog Snap custom input. iOS uses textfield selector as testID
   * is not exposed in page source.
   */
  async fillCustomDialogInput(text: string) {
    const input = resolve({
      detoxTestID: 'custom-input-snap-ui-input',
      androidAppiumTestID: 'custom-input-snap-ui-input',
      iosAppiumXPath:
        '//*[@name="snap-ui-renderer__scrollview"]//*[@name="textfield"]',
    });

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

    const selectorItem = encapsulated({
      detox: () =>
        element(
          by.text(text).withAncestor(by.id('snap-ui-renderer__selector-item')),
        ) as unknown as DetoxElement,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByAndroidUIAutomator(
            `.resourceIdMatches(".*snap-ui-renderer__selector-item.*").childSelector(new UiSelector().text("${text}"))`,
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            `//*[@name="snap-ui-renderer__selector-item" and (@label="${text}" or contains(@label,"${text}") or @name="${text}")] | //*[@name="snap-ui-renderer__selector-item"]//*[@label="${text}" or @name="${text}" or @value="${text}"]`,
          ),
      },
    });
    await Gestures.tap(selectorItem);
  }

  async selectRadioButton(text: string) {
    const radioButton = encapsulated({
      detox: () =>
        element(
          by.text(text).withAncestor(by.id('snap-ui-renderer__radio-button')),
        ) as unknown as DetoxElement,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByAndroidUIAutomator(
            `.resourceIdMatches(".*snap-ui-renderer__radio-button.*").childSelector(new UiSelector().text("${text}"))`,
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            `//*[@name="snap-ui-renderer__radio-button" and (@label="${text}" or contains(@label,"${text}") or @name="${text}")] | //*[@name="snap-ui-renderer__radio-button"]//*[@label="${text}" or @name="${text}" or @value="${text}"]`,
          ),
      },
    });
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
    if (PlatformDetector.isAndroid()) {
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
      // Detox / Android can target `snaps-ui-link-icon`. On iOS Appium, XCUITest
      // does not expose that testID for inline SnapUILink — it surfaces as Text —
      // so assert the visible link label instead (same coverage as before for Detox).
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
    const webId = TestSnapInputSelectorWebIDS[locator];
    await WebView.fillById(webId, message, TEST_SNAPS_WEBVIEW_OPTIONS);
  }

  async approveSignRequest() {
    await Gestures.tap(this.getApproveSignRequestButton);
  }

  /**
   * Blurs the focused field inside the test-snaps WebView so iOS does not keep the
   * keyboard input accessory (prev/next/done bar) over the native confirmation footer.
   */
  async blurActiveWebViewInput(): Promise<void> {
    await WebView.blurActiveElement(TEST_SNAPS_URL);
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
    await Utilities.waitUntil(
      async () => {
        try {
          await this.tapButton('getWebSocketState');

          // eslint-disable-next-line no-restricted-syntax
          await TestHelpers.delay(250);

          const text = await WebView.readTextById(
            TestSnapResultSelectorWebIDS.networkAccessResultSpan,
            TEST_SNAPS_WEBVIEW_OPTIONS,
          );

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
