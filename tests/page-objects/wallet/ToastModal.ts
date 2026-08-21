import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../../app/component-library/components/Toast/ToastModal.testIds';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { sleep } from '../../framework/Utilities';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';

const DEFAULT_TOAST_DISMISS_TIMEOUT_MS = 15_000;
const DEFAULT_TOAST_APPEAR_TIMEOUT_MS = 5_000;
const TOAST_POLL_INTERVAL_MS = 250;

class ToastModal {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(ToastSelectorsIDs.CONTAINER);
  }

  get notificationTitle(): EncapsulatedElementType {
    return Matchers.getElementByID(ToastSelectorsIDs.NOTIFICATION_TITLE);
  }

  get toastCloseButton(): EncapsulatedElementType {
    return Matchers.getElementByText(ToastSelectorsText.CLOSE_BUTTON);
  }

  async tapToastCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.toastCloseButton, {
      elemDescription: 'Toast Modal Close Button',
    });
  }

  /**
   * If a toast is visible, waits for it to disappear. Otherwise returns
   * immediately. Never fails the test when no toast is shown or dismiss is slow.
   * Used before tapping header back controls that top toasts can cover.
   */
  async waitForToastToDismiss(
    options: {
      timeout?: number;
      appearTimeout?: number;
    } = {},
  ): Promise<void> {
    const dismissTimeout = options.timeout ?? DEFAULT_TOAST_DISMISS_TIMEOUT_MS;
    const appearTimeout =
      options.appearTimeout ?? DEFAULT_TOAST_APPEAR_TIMEOUT_MS;

    const visible = await this.pollToastVisible(appearTimeout);
    if (!visible) {
      return;
    }
    try {
      await Assertions.expectElementToNotBeVisible(this.container, {
        description: 'Toast dismissed',
        timeout: dismissTimeout,
      });
    } catch {
      // Toast still visible — continue without failing the test.
    }
  }

  private async pollToastVisible(appearTimeout: number): Promise<boolean> {
    const deadline = Date.now() + appearTimeout;
    while (Date.now() < deadline) {
      try {
        await Assertions.expectElementToBeVisible(this.container, {
          timeout: TOAST_POLL_INTERVAL_MS,
        });
        return true;
      } catch {
        await sleep(TOAST_POLL_INTERVAL_MS);
      }
    }
    return false;
  }
}

export default new ToastModal();
