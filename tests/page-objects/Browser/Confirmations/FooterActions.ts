import { ConfirmationFooterSelectorIDs } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import Assertions from '../../../framework/Assertions';
import Utilities from '../../../framework/Utilities';
import ToastModal from '../../wallet/ToastModal';

class FooterActions {
  get confirmButton() {
    return Matchers.getElementByID(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
  }

  get cancelButton() {
    return Matchers.getElementByID(ConfirmationFooterSelectorIDs.CANCEL_BUTTON);
  }

  async waitForConfirmButton(timeout = 45_000): Promise<void> {
    await Assertions.expectElementToExist(this.confirmButton, {
      timeout,
      description: 'confirm-button',
    });
  }

  /**
   * Wait until confirm-button leaves the hierarchy (does not use isDisplayed).
   * BottomSheet children often report isDisplayed=false while still present.
   */
  async waitForConfirmButtonGone(timeout = 45_000): Promise<void> {
    await Utilities.waitForElementToDisappear(this.confirmButton, timeout);
  }

  async tapConfirmButton(timeout?: number): Promise<void> {
    await ToastModal.waitForToastToDismiss({ appearTimeout: 2_000 });

    // assets-controller@15.0.0's RpcFallbackMiddleware now also runs on
    // regular background polls (previously forced-refresh only), adding a
    // real RPC round trip to the local test chain's node on every poll tick
    // since it's never in the (mocked) Accounts API's supportedNetworks list.
    // That competes with TransactionController's own gas-estimation RPC
    // calls on the same node, so gas fee resolution — which gates
    // `checkEnabled` below — needs more headroom than before.
    const readyTimeout = timeout ?? 45_000;
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm button',
      timeout: readyTimeout,
      checkEnabled: true,
    });

    await this.waitForConfirmButtonGone(readyTimeout);
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
