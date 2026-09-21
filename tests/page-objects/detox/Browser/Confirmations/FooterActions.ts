import { ConfirmationFooterSelectorIDs } from '../../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { ToastSelectorsIDs } from '../../../../../app/component-library/components/Toast/ToastModal.testIds';
import Matchers from '../../../../framework/detox/Matchers';
import Gestures from '../../../../framework/detox/Gestures';
import Assertions from '../../../../framework/detox/Assertions';
import Utilities from '../../../../framework/detox/Utilities';
import { type EncapsulatedElementType } from '../../../../framework/EncapsulatedElement';

/**
 * Detox-native page object for the confirmation footer actions.
 *
 * Detox-world twin of the Appium
 * `tests/page-objects/Browser/Confirmations/FooterActions.ts`.
 *
 * The Appium version delegates the pre-tap toast handling to the Appium
 * `ToastModal.waitForToastToDismiss`. Here that logic is inlined as a
 * detox-native equivalent (see `waitForToastToDismiss`): the toast container
 * is a simple testID element, so no separate page object is needed.
 */
class FooterActions {
  get confirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
  }

  get cancelButton(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationFooterSelectorIDs.CANCEL_BUTTON);
  }

  async waitForConfirmButton(timeout = 30_000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.confirmButton, {
      timeout,
      description: 'confirm-button',
    });
  }

  /**
   * Wait until confirm-button leaves the hierarchy (does not use isDisplayed).
   * BottomSheet children often report isDisplayed=false while still present.
   */
  async waitForConfirmButtonGone(timeout = 30_000): Promise<void> {
    await Utilities.waitForElementToDisappear(this.confirmButton, timeout);
  }

  /**
   * Detox-native equivalent of the Appium
   * `ToastModal.waitForToastToDismiss({ appearTimeout: 2_000 })`.
   *
   * Simplified compared to the Appium page object: it only waits for the
   * toast container (a simple testID element) to disappear and never taps the
   * toast close button. The toast may not appear at all for ledger
   * confirmations, so this is best-effort and never fails the test.
   */
  async waitForToastToDismiss(appearTimeout = 2_000): Promise<void> {
    const toastContainer = Matchers.getElementByID(ToastSelectorsIDs.CONTAINER);
    const visible = await Utilities.isElementVisible(
      toastContainer,
      appearTimeout,
    );
    if (!visible) {
      return;
    }
    try {
      await Utilities.waitForElementToDisappear(toastContainer, 15_000);
    } catch {
      // Toast still visible — continue without failing the test.
    }
  }

  /**
   * Taps the Confirm button on the confirmation footer.
   *
   * By default it also waits for the confirm button to leave the hierarchy,
   * which is the expected post-Confirm transition for software accounts.
   * Hardware (Ledger) confirmations legitimately KEEP the confirmation sheet
   * mounted while the HardwareWalletBottomSheet takes over the signing, so
   * HW specs must pass `{ waitForDismiss: false }` and instead assert the
   * hardware bottom sheet as the transition signal.
   *
   * @param timeout - Max time to wait for the confirm button readiness (ms).
   * @param options - Behaviour toggles.
   * @param options.waitForDismiss - Whether to wait for the footer to
   * unmount after the tap (default true).
   */
  async tapConfirmButton(
    timeout?: number,
    options: { waitForDismiss?: boolean } = {},
  ): Promise<void> {
    await this.waitForToastToDismiss();

    const readyTimeout = timeout ?? 30_000;
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm button',
      timeout: readyTimeout,
      checkEnabled: true,
    });

    if (options.waitForDismiss ?? true) {
      await this.waitForConfirmButtonGone(readyTimeout);
    }
  }

  /**
   * Taps Confirm and waits for the confirmation footer to unmount, signalling
   * the confirmation has been processed.
   */
  async tapConfirmAndExpectConfirmationUnmount(timeout = 25000): Promise<void> {
    await this.tapConfirmButton();
    await Assertions.expectElementToNotBeVisible(this.confirmButton, {
      timeout,
      description: 'Wait for confirmation to process',
    });
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel button',
      delay: 1800,
    });
  }
}

export default new FooterActions();
