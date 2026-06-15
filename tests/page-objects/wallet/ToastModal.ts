import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../../app/component-library/components/Toast/ToastModal.testIds';
import Assertions from '../../framework/Assertions';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { PlaywrightAssertions } from '../../framework';
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
   * If a bottom toast is visible, waits for it to disappear. Otherwise returns
   * immediately. Never fails the test when no toast is shown or dismiss is slow.
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
          // Toast still visible — continue without failing the test.
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
          // Toast still visible — continue without failing the test.
        }
      },
    });
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
