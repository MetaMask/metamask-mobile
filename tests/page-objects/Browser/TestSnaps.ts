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
  SnapUIRendererSelectorIDs,
  SnapUIInputSelectorIDs,
  SnapUIInputSelectorXPaths,
  snapUiNativeIosXPath,
  snapUISelectorItemAndroidUIAutomator,
  snapUISelectorItemIosXPath,
  SNAP_UI_DROPDOWN_SHEET_TITLE,
  snapUIJsxCountAndroidXPath,
  snapUIJsxCountIosXPath,
  TEST_SNAPS_URL,
  testSnapsAndroidScrollOptions,
} from '../../selectors/Browser/TestSnaps.selectors';
import type { TapOptions } from '../../framework/types';
import WebView, { type WebViewByIdOptions } from '../../framework/WebView';
import Gestures from '../../framework/Gestures';
import { SNAP_INSTALL_CONNECT } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapConnectionRequest/InstallSnapConnectionRequest.constants';
import { SNAP_INSTALL_PERMISSIONS_REQUEST_APPROVE } from '../../../app/components/Approvals/InstallSnapApproval/components/InstallSnapPermissionsRequest/InstallSnapPermissionsRequest.constants';
import { SNAP_INSTALL_OK } from '../../../app/components/Approvals/InstallSnapApproval/InstallSnapApproval.constants';
import Assertions from '../../framework/Assertions';
import Utilities, { sleep } from '../../framework/Utilities';
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
import { getWindowSize } from '../../framework/DeviceInfoCache';
import { getDriver } from '../../framework/PlaywrightUtilities';
import { Json } from '@metamask/utils';
import ToastModal from '../wallet/ToastModal';
import { SolanaTestDappSelectorsWebIDs } from '../../selectors/Browser/SolanaTestDapp.selectors';

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
    return this.getSnapUiNativeElement(SnapUIRendererSelectorIDs.checkbox);
  }

  get dateTimePickerTouchable(): EncapsulatedElementType {
    return this.getSnapUiNativeElement(
      SnapUIRendererSelectorIDs.dateTimeTouchable,
    );
  }

  get datePickerTouchable(): EncapsulatedElementType {
    return this.getSnapUiNativeElement(SnapUIRendererSelectorIDs.dateTouchable);
  }

  get timePickerTouchable(): EncapsulatedElementType {
    return this.getSnapUiNativeElement(SnapUIRendererSelectorIDs.timeTouchable);
  }

  get dateTimePickerOkButton(): EncapsulatedElementType {
    return Matchers.getElementByText('OK');
  }

  get snapUIRendererScrollView() {
    return Matchers.scrollContainer(SnapUIRendererSelectorIDs.scrollView);
  }

  /** Native Snap UI control — iOS uses name XPath (testID often not tappable). */
  getSnapUiNativeElement(testID: string): EncapsulatedElementType {
    return resolve({
      detoxTestID: testID,
      androidAppiumTestID: testID,
      iosAppiumXPath: snapUiNativeIosXPath(testID),
    });
  }

  /** Snap UI text input — iOS: first scrollview textfield (index 0). */
  getSnapUiInput(name: string): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        element(by.id(`${name}-snap-ui-input`)) as unknown as DetoxElement,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(`${name}-snap-ui-input`, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            SnapUIInputSelectorXPaths.textfieldIos,
            { lastElement: false, index: 0 },
          ),
      },
    });
  }

  /** JSX Snap counter ("0" / "1"), scoped under the Snap UI scrollview. */
  jsxCountElement(count: string): EncapsulatedElementType {
    const scrollViewId = SnapUIRendererSelectorIDs.scrollView;
    return encapsulated({
      detox: () =>
        element(
          by.text(count).withAncestor(by.id(scrollViewId)),
        ) as unknown as DetoxElement,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByXPath(
            snapUIJsxCountAndroidXPath(count),
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(snapUIJsxCountIosXPath(count)),
      },
    });
  }

  async tapJsxIncrementButton(): Promise<void> {
    const button = Matchers.getElementByText(/^Increment$/i);
    await Gestures.waitAndTap(
      button,
      this.snapUiTapOptions({ elemDescription: 'JSX Increment' }),
    );
  }

  /** iOS: skip displayed/enabled waits for Snap UI nodes with visible=false. */
  private snapUiTapOptions(extra: TapOptions = {}): TapOptions {
    if (PlatformDetector.isIOSAppium()) {
      return { checkForDisplayed: false, checkEnabled: false, ...extra };
    }
    return extra;
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
        if (!actualClientVersion.startsWith(expectedClientVersion)) {
          throw new Error(
            `Client version mismatch: Expected version to start with "${expectedClientVersion}", got "${actualClientVersion}".`,
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
    // Optional "I, " prefix: Snap UI icon accessibility labels (e.g. "I, OK").
    const button = Matchers.getElementByText(/^(I, )?OK$/i);
    await Gestures.waitAndTap(button, this.snapUiTapOptions());
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
    // Optional "I, " prefix: Snap UI icon accessibility labels (e.g. "I, Submit").
    const button = Matchers.getElementByText(/^(I, )?Submit$/i);
    await Gestures.waitAndTap(button, this.snapUiTapOptions());
  }

  async dismissAlert() {
    try {
      await this.tapOkButton();
    } catch (error) {
      // Teardown-only helper: specs assert on the alert before dismissing it,
      // and the alert can close on its own first, so a missing OK button means
      // there is nothing left to dismiss.
      const message = error instanceof Error ? error.message : String(error);
      if (
        !/stale|wasn't found|no such element|still not displayed/i.test(message)
      ) {
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
    await Gestures.typeText(this.getSnapUiInput(name), text, {
      hideKeyboard: !PlatformDetector.isIOSAppium(),
    });
    if (PlatformDetector.isIOSAppium()) {
      await this.dismissSnapUiKeyboard();
    }
  }

  /** iOS: WDA tapOutside fails on Snap UI sheets — tap near the header instead. */
  private async dismissSnapUiKeyboard(): Promise<void> {
    const drv = getDriver();
    if (!drv) {
      return;
    }
    try {
      const { width, height } = getWindowSize();
      await drv
        .action('pointer', { parameters: { pointerType: 'touch' } })
        .move({ x: Math.floor(width / 2), y: Math.floor(height * 0.18) })
        .down()
        .pause(50)
        .up()
        .perform();
    } catch {
      // already dismissed
    }
  }

  async fillCustomDialogInput(text: string) {
    const input = resolve({
      detoxTestID: SnapUIInputSelectorIDs.customDialogInput,
      androidAppiumTestID: SnapUIInputSelectorIDs.customDialogInput,
      iosAppiumXPath: SnapUIInputSelectorXPaths.textfieldIos,
    });

    await Gestures.typeText(input, text, { hideKeyboard: true });
  }

  async selectInNativeDropdown(
    selector: keyof typeof NativeDropdownSelectorWebIDS,
    text: string,
  ): Promise<void> {
    const dropdown = this.getSnapUiNativeElement(
      NativeDropdownSelectorWebIDS[selector],
    );

    await Gestures.tap(dropdown, this.snapUiTapOptions());
    try {
      await this.waitForSnapUiDropdownOption(text);
    } catch (firstError) {
      if (!PlatformDetector.isIOSAppium()) {
        throw firstError;
      }
      // First tap often swallowed while keyboard is up — blur and retry once.
      await this.dismissSnapUiKeyboard();
      await Gestures.tap(dropdown, this.snapUiTapOptions());
      await this.waitForSnapUiDropdownOption(text);
    }

    const selectorItem = encapsulated({
      detox: () =>
        element(
          by
            .text(text)
            .withAncestor(by.id(SnapUIRendererSelectorIDs.selectorItem)),
        ) as unknown as DetoxElement,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByAndroidUIAutomator(
            snapUISelectorItemAndroidUIAutomator(text),
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            snapUISelectorItemIosXPath(text),
            { lastElement: true },
          ),
      },
    });
    await Gestures.tap(selectorItem, this.snapUiTapOptions());
  }

  /** Wait for dropdown sheet + option (iOS: hierarchy only, not displayed). */
  private async waitForSnapUiDropdownOption(text: string): Promise<void> {
    if (PlatformDetector.isAndroidAppium()) {
      await Assertions.expectTextDisplayed(text, {
        timeout: 15_000,
        description: `Snap UI dropdown option "${text}"`,
      });
      return;
    }

    if (!PlatformDetector.isIOSAppium()) {
      return;
    }

    const optionXPath = snapUISelectorItemIosXPath(text);
    const sheetOpenXPath = [
      `//*[@name="${SnapUIRendererSelectorIDs.selectorItem}"]`,
      `//*[@label="${SNAP_UI_DROPDOWN_SHEET_TITLE}" or @name="${SNAP_UI_DROPDOWN_SHEET_TITLE}"]`,
    ].join(' | ');

    await Utilities.executeWithRetry(
      async () => {
        const drv = getDriver();
        if (!drv) {
          throw new Error('Driver is not available');
        }
        const sheetNodes = await drv.$$(sheetOpenXPath);
        if ((await sheetNodes.length) === 0) {
          throw new Error('Snap UI dropdown/selector sheet not open yet');
        }
        const optionNodes = await drv.$$(optionXPath);
        if ((await optionNodes.length) === 0) {
          throw new Error(
            `Snap UI dropdown option "${text}" not in hierarchy yet`,
          );
        }
      },
      {
        timeout: 15_000,
        description: `Snap UI dropdown option "${text}"`,
      },
    );
  }

  async selectRadioButton(text: string) {
    const radioButton = encapsulated({
      detox: () =>
        element(
          by
            .text(text)
            .withAncestor(by.id(SnapUIRendererSelectorIDs.radioButton)),
        ) as unknown as DetoxElement,
      appium: {
        android: () =>
          PlaywrightMatchers.getElementByAndroidUIAutomator(
            `.resourceIdMatches(".*${SnapUIRendererSelectorIDs.radioButton}.*").childSelector(new UiSelector().text("${text}"))`,
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            `//*[@name="${SnapUIRendererSelectorIDs.radioButton}" and (@label="${text}" or contains(@label,"${text}") or @name="${text}")] | //*[@name="${SnapUIRendererSelectorIDs.radioButton}"]//*[@label="${text}" or @name="${text}" or @value="${text}"]`,
          ),
      },
    });
    await Gestures.tap(radioButton, this.snapUiTapOptions());
  }

  async tapCheckbox() {
    await Gestures.tap(this.checkboxElement, this.snapUiTapOptions());
  }

  /** Android: swipe Snap UI scrollview so date/time rows enter the hierarchy. */
  async revealSnapUiDatePickers(): Promise<void> {
    if (!PlatformDetector.isAndroidAppium()) {
      return;
    }

    const scrollView = this.getSnapUiNativeElement(
      SnapUIRendererSelectorIDs.scrollView,
    );
    for (let i = 0; i < 2; i++) {
      await Gestures.swipe(scrollView, 'up', {
        speed: 'slow',
        percentage: 0.45,
        elemDescription: 'Snap UI scrollview — reveal date/time pickers',
      });
    }
  }

  private async openSnapUiPicker(
    touchable: EncapsulatedElementType,
    elemDescription: string,
    scrollOptions: { startPositionX?: number; startPositionY?: number } = {},
  ): Promise<void> {
    await Gestures.scrollToElement(touchable, this.snapUIRendererScrollView, {
      elemDescription,
      ...scrollOptions,
    });
    await Gestures.waitAndTap(
      touchable,
      this.snapUiTapOptions({ checkStability: true, elemDescription }),
    );
    await Gestures.waitAndTap(this.dateTimePickerOkButton, {
      elemDescription: `${elemDescription} OK`,
    });
  }

  async selectDateInDateTimePicker() {
    await this.openSnapUiPicker(
      this.dateTimePickerTouchable,
      'date-time picker',
      {
        startPositionX: 0,
        startPositionY: 0,
      },
    );
    // Android date+time is two native steps.
    if (PlatformDetector.isAndroid()) {
      await Gestures.waitAndTap(this.dateTimePickerOkButton);
    }
  }

  async selectDateInDatePicker() {
    await this.revealSnapUiDatePickers();
    await this.openSnapUiPicker(this.datePickerTouchable, 'date picker');
  }

  async selectTimeInTimePicker() {
    await this.revealSnapUiDatePickers();
    await this.openSnapUiPicker(this.timePickerTouchable, 'time picker');
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

    // Wait explicitly between steps; Snap install sheets are slower on Android CI.
    const stepTimeout = PlatformDetector.isAndroidAppium() ? 60_000 : 15_000;
    const waitForSheetTransition = async (
      elem: EncapsulatedElementType,
    ): Promise<void> => {
      if (!FrameworkDetector.isAppium()) {
        return;
      }
      await Utilities.waitForElementToDisappear(elem, stepTimeout);
    };

    await Gestures.waitAndTap(this.getConnectSnapButton, {
      elemDescription: 'Connect Snap button',
      timeout: stepTimeout,
      waitForElementToDisappear: true,
    });
    await waitForSheetTransition(this.getConnectSnapButton);

    await Gestures.waitAndTap(this.getApproveSnapPermissionsRequestButton, {
      elemDescription: 'Approve permission for Snap button',
      timeout: stepTimeout,
      waitForElementToDisappear: true,
    });
    await waitForSheetTransition(this.getApproveSnapPermissionsRequestButton);

    await Gestures.waitAndTap(this.getConnectSnapInstallOkButton, {
      elemDescription: 'OK button',
      timeout: stepTimeout,
      waitForElementToDisappear: true,
    });
    await waitForSheetTransition(this.getConnectSnapInstallOkButton);
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
    if (FrameworkDetector.isAppium()) {
      await WebView.blurActiveElement(TEST_SNAPS_URL);
      return;
    }

    // Detox path — keep until remaining SmokeSnaps suites finish migrating to Appium.
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
    await this.blurActiveWebViewInput();
    // Multichain Solana signing can use SnapDialog/BottomSheetFooter instead of
    // redesigned `confirm-button`.
    await Gestures.waitAndTap(
      Matchers.getElementByID(
        SolanaTestDappSelectorsWebIDs.CONFIRM_SIGN_MESSAGE_BUTTON,
      ),
      { elemDescription: 'confirm Solana snap signature' },
    );
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
          await sleep(250);

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
      { timeout: 30_000, interval: 1000 },
    );
  }
}

export default new TestSnaps();
