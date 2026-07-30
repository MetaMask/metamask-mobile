import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../../app/component-library/components/Toast/ToastModal.testIds';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PlaywrightAssertions, PlaywrightGestures } from '../../framework';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { sleep } from '../../framework/Utilities';
import {
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import { PlaywrightElement } from '../../framework/PlaywrightAdapter';

const DEFAULT_TOAST_DISMISS_TIMEOUT_MS = 15_000;
const DEFAULT_TOAST_APPEAR_TIMEOUT_MS = 5_000;
const TOAST_POLL_INTERVAL_MS = 250;
const FORCE_DISMISS_SETTLE_TIMEOUT_MS = 5_000;

class ToastModal {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(ToastSelectorsIDs.CONTAINER);
  }

  get containerElement(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ToastSelectorsIDs.CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(ToastSelectorsIDs.CONTAINER, {
          exact: true,
        }),
    });
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
   * immediately. When auto-dismiss is slow on Appium, force-dismisses via
   * swipe-up (product supports pan dismiss) so the toast cannot keep covering
   * the account picker / header controls. Still best-effort — never fails the
   * test if the toast is absent or resists dismiss.
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

    await encapsulatedAction({
      detox: async () => {
        const visible = await this.pollDetoxToastVisible(appearTimeout);
        if (!visible) {
          return;
        }
        try {
          await Assertions.expectElementToNotBeVisible(this.container, {
            description: 'Toast dismissed',
            timeout: dismissTimeout,
          });
        } catch {
          try {
            await this.tapToastCloseButton();
            await Assertions.expectElementToNotBeVisible(this.container, {
              description: 'Toast dismissed after close tap',
              timeout: FORCE_DISMISS_SETTLE_TIMEOUT_MS,
            });
          } catch {
            // Toast still visible — continue without failing the test.
          }
        }
      },
      appium: async () => {
        const toast = await asPlaywrightElement(this.containerElement);
        const visible = await this.pollAppiumToastVisible(toast, appearTimeout);
        if (!visible) {
          return;
        }
        try {
          await PlaywrightAssertions.expectElementToNotBeVisible(toast, {
            description: 'Toast dismissed',
            timeout: dismissTimeout,
          });
        } catch {
          await this.forceDismissAppiumToast(toast);
          const refreshed = await asPlaywrightElement(this.containerElement);
          try {
            await PlaywrightAssertions.expectElementToNotBeVisible(refreshed, {
              description: 'Toast dismissed after force dismiss',
              timeout: FORCE_DISMISS_SETTLE_TIMEOUT_MS,
            });
          } catch {
            // Toast still visible — callers should reopen/retry critical taps.
          }
        }
      },
    });
  }

  /**
   * Best-effort Appium dismiss: swipe up from the toast center (matches the
   * product pan-to-dismiss gesture), then fall back to tapping the toast.
   */
  private async forceDismissAppiumToast(
    toast: PlaywrightElement,
  ): Promise<void> {
    try {
      const native = toast.unwrap();
      const location = await native.getLocation();
      const size = await native.getSize();
      const centerX = Math.floor(location.x + size.width / 2);
      const fromY = Math.floor(location.y + size.height * 0.6);
      const toY = Math.max(0, Math.floor(location.y - size.height));

      await PlaywrightGestures.swipe({
        scrollParams: { direction: 'up' },
        duration: 200,
        percent: 0.9,
        from: { x: centerX, y: fromY },
        to: { x: centerX, y: toY },
      });
      return;
    } catch {
      // Fall through to tap.
    }

    try {
      await toast.unwrap().click();
    } catch {
      // Best-effort only.
    }
  }

  private async pollAppiumToastVisible(
    toast: PlaywrightElement,
    appearTimeout: number,
  ): Promise<boolean> {
    const deadline = Date.now() + appearTimeout;
    while (Date.now() < deadline) {
      try {
        if (await toast.unwrap().isDisplayed()) {
          return true;
        }
      } catch {
        // Stale element while the sheet animates.
      }
      await sleep(TOAST_POLL_INTERVAL_MS);
    }
    return false;
  }

  private async pollDetoxToastVisible(appearTimeout: number): Promise<boolean> {
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
