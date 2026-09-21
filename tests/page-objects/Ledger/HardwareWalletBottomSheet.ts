import Matchers from '../../framework/detox/Matchers';
import Gestures from '../../framework/detox/Gestures';
import Assertions from '../../framework/detox/Assertions';
import Utilities from '../../framework/detox/Utilities';
import { createLogger } from '../../framework/logger';
import { HardwareWalletBottomSheetSelectorsIDs } from '../../selectors/Ledger/Ledger.selectors';

const logger = createLogger({ name: 'HardwareWalletBottomSheet' });

// Mirrors ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID in app/core/HardwareWallet/
// components/HardwareWalletBottomSheet/contents/ErrorContent.tsx (lines
// 39-40, applied to the Continue Button at line 191). Kept local to this
// page object: the shared selectors file has no entry for it (the app-not-open
// Continue button is likewise matched directly by this page object).
const ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID = 'error-content-continue-button';

class HardwareWalletBottomSheet {
  get container() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.CONTAINER,
    );
  }

  get deviceSelectionContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.DEVICE_SELECTION_CONTENT,
    );
  }

  get scanningIndicator() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.SCANNING,
    );
  }

  get virtualDeviceItem() {
    return Matchers.getElementByText('Ledger Nano X');
  }

  get connectButton() {
    return Matchers.getElementByText('Connect');
  }

  get continueButton() {
    return Matchers.getElementByText('Continue');
  }

  get connectingContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.CONNECTING_CONTENT,
    );
  }

  get awaitingAppContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.AWAITING_APP_CONTENT,
    );
  }

  get awaitingConfirmationContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.AWAITING_CONFIRMATION_CONTENT,
    );
  }

  get successContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.SUCCESS_CONTENT,
    );
  }

  get errorContent() {
    return Matchers.getElementByID(
      HardwareWalletBottomSheetSelectorsIDs.ERROR_CONTENT,
    );
  }

  get errorContentContinueButton() {
    return Matchers.getElementByID(ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID);
  }

  async waitForVisible(timeout = 60000): Promise<void> {
    // Wait for the bottom sheet container to appear in any state
    // (scanning, connecting, awaiting-confirmation, etc.)
    await Assertions.expectElementToBeVisible(this.container, {
      timeout,
      description: 'hardware wallet bottom sheet',
    });
  }

  /**
   * Debug helper: probe each known sheet state id in turn and log which (if
   * any) is currently visible. Used to make HW-sheet transition failures
   * diagnosable (run11: sign request silently dropped after reconnect —
   * failure screenshot showed the app on wallet home with no sheets, so the
   * pre-assert state was unknown).
   *
   * This is a point-in-time snapshot, not a wait: each id gets a short
   * visibility window so a fully hidden sheet costs ~1s per id.
   *
   * @param timeoutMs - Visibility window per state id, in ms (default 1000).
   */
  async logCurrentState(timeoutMs = 1000): Promise<void> {
    const states: {
      name: string;
      getter: () => ReturnType<typeof Matchers.getElementByID>;
    }[] = [
      { name: 'container', getter: () => this.container },
      {
        name: 'deviceSelectionContent',
        getter: () => this.deviceSelectionContent,
      },
      { name: 'connectingContent', getter: () => this.connectingContent },
      { name: 'awaitingAppContent', getter: () => this.awaitingAppContent },
      {
        name: 'awaitingConfirmationContent',
        getter: () => this.awaitingConfirmationContent,
      },
      { name: 'successContent', getter: () => this.successContent },
      { name: 'errorContent', getter: () => this.errorContent },
    ];

    for (const { name, getter } of states) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const visible = await Utilities.isElementVisible(getter(), timeoutMs);
        logger.debug(
          `HardwareWalletBottomSheet state probe: ${name} = ${
            visible ? 'VISIBLE' : 'hidden'
          }`,
        );
      } catch (error) {
        logger.warn(
          `HardwareWalletBottomSheet state probe: ${name} check failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  }

  async waitForDeviceSelection(timeout = 60000): Promise<void> {
    // Wait for the device-selection-content (Scanning state)
    await Assertions.expectElementToBeVisible(this.deviceSelectionContent, {
      timeout,
    });
  }

  async selectVirtualDevice(): Promise<void> {
    await Gestures.waitAndTap(this.virtualDeviceItem, {
      elemDescription: 'Virtual Ledger device',
      timeout: 15000,
    });
  }

  async tapConnect(): Promise<void> {
    await Gestures.waitAndTap(this.connectButton, {
      elemDescription: 'Connect button on device selection',
    });
  }

  /**
   * If the "app not open" state is visible within `timeoutMs`, taps its
   * Continue button and returns true; otherwise returns false.
   *
   * This state (AwaitingAppContent, e.g. when the Speculos device was left
   * on the wrong app and the requested app is Ethereum) shows the sheet with
   * a "Continue" CTA whose handler re-runs `ensureDeviceReady`, instructing
   * the app to open the required app on the device.
   *
   * The AwaitingApp Continue button has no testID (unlike the error
   * content's `error-content-continue-button`), so it is matched by text,
   * consistent with the other text-based getters in this page object.
   *
   * @param timeoutMs - Max time to wait for the app-not-open state, in ms.
   * @returns true if the state was visible and Continue was tapped.
   */
  async continueIfAppNotOpen(timeoutMs = 20000): Promise<boolean> {
    const visible = await Utilities.isElementVisible(
      this.awaitingAppContent,
      timeoutMs,
    );
    if (!visible) {
      return false;
    }
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue button (app not open recovery)',
    });
    return true;
  }

  /**
   * Bounded recovery from the sheet's error state (e.g. "Device Unresponsive
   * / Connection timed out" ErrorContent when the confirm-time BLE reconnect
   * loses the scan race): the error content's Continue button routes to
   * handleErrorContinue → retryEnsureDeviceReady, which retries the BLE
   * connection.
   *
   * Modeled on {@link continueIfAppNotOpen}: short-poll for the error state's
   * Continue button, tap it when found, then wait for the sheet to leave the
   * error state before re-checking. Never throws — if `maxAttempts` is
   * exhausted, return and let the caller's subsequent assertions produce the
   * failure. If the error state never appears, return immediately so the
   * happy path is unaffected.
   *
   * @param maxAttempts - Maximum number of Continue taps (default 3).
   */
  async recoverFromErrorState(maxAttempts = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // eslint-disable-next-line no-await-in-loop
      const errorStateVisible = await Utilities.isElementVisible(
        this.errorContentContinueButton,
        10000,
      );
      if (!errorStateVisible) {
        return;
      }
      logger.debug(
        `HardwareWalletBottomSheet recoverFromErrorState: error state visible (attempt ${attempt}/${maxAttempts}), tapping Continue to retry the connection`,
      );
      await Gestures.waitAndTap(this.errorContentContinueButton, {
        elemDescription: 'Continue button (error state recovery)',
      });
      // Wait up to ~30s for the sheet to leave the error state (Continue
      // button gone); log — never throw — if it lingers.
      try {
        // eslint-disable-next-line no-await-in-loop
        await Utilities.waitForElementToDisappear(
          this.errorContentContinueButton,
          30000,
        );
        logger.debug(
          `HardwareWalletBottomSheet recoverFromErrorState: left error state after Continue tap (attempt ${attempt}/${maxAttempts})`,
        );
      } catch (error) {
        logger.debug(
          `HardwareWalletBottomSheet recoverFromErrorState: sheet still in error state after Continue tap (attempt ${attempt}/${maxAttempts}): ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  }
}

export default new HardwareWalletBottomSheet();
