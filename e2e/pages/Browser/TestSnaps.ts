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
import { ConfirmationFooterSelectorIDs } from '../../selectors/Confirmation/ConfirmationView.selectors';
import { waitForTestSnapsToLoad } from '../../viewHelper';
import { RetryOptions } from '../../framework';
import { Json } from '@metamask/utils';
import { createLogger } from '../../framework/logger';
/* eslint-disable import/no-nodejs-modules */
import { exec } from 'child_process';
import { promisify } from 'util';
/* eslint-enable import/no-nodejs-modules */

const execAsync = promisify(exec);

const logger = createLogger({
  name: 'TestSnaps',
});

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
    const webElement = await Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapResultSelectorWebIDS.clientStatusResultSpan,
    );

    return await Utilities.executeWithRetry(async () => {
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
  }

  async navigateToTestSnap(): Promise<void> {
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(TEST_SNAPS_URL);
    await waitForTestSnapsToLoad();
  }

  /**
   * Captures diagnostic information about a Snap crash
   * @param snapId - The Snap ID to check for (e.g., "npm:@metamask/ethereum-provider-example-snap")
   * @returns Object containing crash detection status and diagnostic information
   */
  async getSnapCrashDiagnostics(snapId?: string): Promise<{
    hasCrash: boolean;
    dialogMessage?: string;
    deviceLogs?: string;
    errorDetails?: string;
  }> {
    const diagnostics: {
      hasCrash: boolean;
      dialogMessage?: string;
      deviceLogs?: string;
      errorDetails?: string;
    } = {
      hasCrash: false,
    };

    try {
      logger.debug(
        `Gathering Snap crash diagnostics${snapId ? ` (${snapId})` : ''}`,
      );

      // 1. Check for crash dialog in UI
      try {
        const crashMessage = snapId
          ? `The snap "${snapId}" has been terminated during execution.`
          : 'has been terminated during execution';

        await Assertions.expectTextDisplayed(crashMessage, {
          timeout: 2000,
          description: 'check for Snap crash dialog',
        });

        diagnostics.hasCrash = true;
        diagnostics.dialogMessage = crashMessage;

        // Try to capture the full dialog text if possible
        try {
          // The dialog might have more text, try to get it
          const fullMessage = snapId
            ? `The snap "${snapId}" has been terminated during execution.`
            : 'has been terminated during execution';
          diagnostics.dialogMessage = fullMessage;
        } catch (error) {
          logger.debug('Could not capture full dialog message');
        }

        logger.error(
          `Snap crash dialog detected${snapId ? ` for ${snapId}` : ''}`,
        );
      } catch (error) {
        logger.debug('No Snap crash dialog detected');
      }

      // 2. Check device logs for detailed error information
      if (diagnostics.hasCrash) {
        try {
          const platform = device.getPlatform();
          let logText = '';

          if (platform === 'android') {
            const deviceId = device.id || '';
            const deviceFlag = deviceId ? `-s ${deviceId}` : '';
            // Get more recent logs (last 1000 lines) to capture stack traces and our custom logs
            // Include our log prefixes: SnapsExecutionWebView, Engine, SNAP BRIDGE
            const command = `adb ${deviceFlag} logcat -d -t 1000 | grep -iE "(reactnativejs|metamask|snap|error|exception|crash|SnapsExecutionWebView|\\[Engine\\]|\\[SNAP BRIDGE\\])" || true`;
            logger.debug(`Fetching device logs: ${command}`);
            const { stdout } = await execAsync(command);
            logText = stdout || '';
          } else if (platform === 'ios') {
            // Include our log prefixes in the predicate
            const command = `xcrun simctl spawn booted log show --predicate 'processImagePath contains "MetaMask" OR eventMessage contains "snap" OR eventMessage contains "error" OR eventMessage contains "crash" OR eventMessage contains "SnapsExecutionWebView" OR eventMessage contains "[Engine]" OR eventMessage contains "[SNAP BRIDGE]"' --last 2m 2>/dev/null || true`;
            logger.debug(`Fetching device logs: ${command}`);
            const { stdout } = await execAsync(command);
            logText = stdout || '';
          }

          if (logText) {
            diagnostics.deviceLogs = logText;
            logger.debug(
              `Captured ${logText.length} characters of device logs`,
            );

            // Try to extract error details from logs
            const errorPattern =
              /(?:error|exception|crash|failed|terminated)[\s\S]{0,500}/gi;
            const errorMatches = logText.match(errorPattern);
            if (errorMatches && errorMatches.length > 0) {
              diagnostics.errorDetails = errorMatches
                .slice(0, 5)
                .join('\n---\n');
              logger.debug('Extracted error details from device logs');
            }
          }
        } catch (error) {
          logger.warn(
            `Failed to capture device logs: ${error instanceof Error ? error.message : String(error)}`,
          );
        }

        // 3. Check for error messages in result spans
        try {
          const resultSpan = (await Matchers.getElementByWebID(
            BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
            TestSnapResultSelectorWebIDS.ethereumProviderResultSpan,
          )) as IndexableWebElement;
          const resultText = await resultSpan.runScript(
            (el) => el.textContent || '',
          );
          if (resultText?.includes('error')) {
            diagnostics.errorDetails = `Result span error: ${resultText}`;
            logger.debug('Found error in result span');
          }
        } catch (error) {
          // Result span might not exist or be visible, that's okay
          logger.debug('Could not check result span for errors');
        }
      }

      return diagnostics;
    } catch (error) {
      logger.warn(
        `Failed to gather Snap crash diagnostics: ${error instanceof Error ? error.message : String(error)}`,
      );
      return diagnostics;
    }
  }

  async tapButton(
    buttonLocator: keyof typeof TestSnapViewSelectorWebIDS,
  ): Promise<void> {
    const webElement = Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      TestSnapViewSelectorWebIDS[buttonLocator],
    );

    try {
      await Gestures.scrollToWebViewPort(webElement);
      await Gestures.tapWebElement(webElement);
    } catch (error) {
      const originalError =
        error instanceof Error ? error.message : String(error);
      logger.warn(
        `Error while tapping button "${buttonLocator}": ${originalError}`,
      );
      // Check if the error is due to a Snap crash (appears as a dialog box)
      logger.debug('Gathering Snap crash diagnostics...');
      const diagnostics = await this.getSnapCrashDiagnostics();
      if (diagnostics.hasCrash) {
        // Build comprehensive error message with all diagnostic information
        let errorMessage = `Snap crashed while tapping button "${buttonLocator}".\n`;
        errorMessage += `Dialog Message: ${diagnostics.dialogMessage || 'Unknown'}\n`;

        if (diagnostics.errorDetails) {
          errorMessage += `\nError Details:\n${diagnostics.errorDetails}\n`;
        }

        if (diagnostics.deviceLogs) {
          // Include a snippet of relevant logs (last 1000 chars to avoid huge messages)
          const logSnippet = diagnostics.deviceLogs.slice(-1000);
          errorMessage += `\nDevice Logs (snippet):\n${logSnippet}\n`;
          logger.debug(
            `Full device logs available (${diagnostics.deviceLogs.length} characters)`,
          );
        }

        logger.error(`Snap Crash Diagnostics:\n${errorMessage}`);

        // Dismiss the alert dialog if present
        try {
          await this.dismissAlert();
        } catch (dismissError) {
          logger.debug(
            `Could not dismiss alert: ${dismissError instanceof Error ? dismissError.message : String(dismissError)}`,
          );
        }

        throw new Error(errorMessage);
      }
      logger.debug('No Snap crash detected, re-throwing original error');
      // Re-throw the original error if it's not a Snap crash
      throw error;
    }
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
    await Gestures.typeInWebElement(webElement, message);
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
