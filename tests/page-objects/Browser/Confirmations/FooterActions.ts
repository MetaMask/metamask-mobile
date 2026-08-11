import { ConfirmationFooterSelectorIDs } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import Assertions from '../../../framework/Assertions';
import { encapsulatedAction } from '../../../framework/encapsulatedAction';
import { EncapsulatedElementType } from '../../../framework/EncapsulatedElement';
import { FrameworkDetector } from '../../../framework/FrameworkDetector';
import { PlatformDetector } from '../../../framework/PlatformLocator';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import PlaywrightAssertions from '../../../framework/PlaywrightAssertions';
import Utilities, { sleep } from '../../../framework/Utilities';
import ToastModal from '../../wallet/ToastModal';

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
    await Assertions.expectElementToExist(this.confirmButton, {
      timeout,
      description: 'confirm-button',
    });
  }

  /**
   * Wait until confirm-button leaves the hierarchy (does not use isDisplayed).
   * BottomSheet children often report isDisplayed=false while still present.
   */
  async waitForConfirmButtonGone(timeout = 30_000): Promise<void> {
    if (!FrameworkDetector.isAppium()) {
      await Utilities.waitForElementToDisappear(this.confirmButton, timeout);
      return;
    }

    const el = await PlaywrightMatchers.getElementById(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (!(await el.unwrap().isExisting())) {
        return;
      }
      await sleep(250);
    }
    throw new Error(`confirm-button still in hierarchy after ${timeout}ms`);
  }

  async tapConfirmButton(timeout?: number): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const isAndroid = device.getPlatform() === 'android';
        // Android needs extra pre-tap delay so toasts do not obscure the button
        await Gestures.waitAndTap(this.confirmButton, {
          elemDescription: 'Confirm button',
          delay: isAndroid ? 4800 : 1800,
          timeout,
          waitForElementToDisappear: isAndroid,
        });
      },
      appium: async () => {
        await ToastModal.waitForToastToDismiss({ appearTimeout: 2_000 });

        const isAndroid = PlatformDetector.isAndroid();
        const maxRetries = Math.max(5, Math.ceil((timeout ?? 30000) / 1000));
        let didClick = false;
        await PlaywrightAssertions.expectConditionWithRetry(
          async () => {
            const el = await PlaywrightMatchers.getElementById(
              ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
            );
            const exists = await el.unwrap().isExisting();
            if (!exists) {
              if (didClick) {
                return;
              }
              throw new Error('confirm-button not in hierarchy yet');
            }

            if (didClick) {
              throw new Error('confirm-button still present after click');
            }

            if (isAndroid) {
              const enabled = await el.unwrap().isEnabled();
              if (!enabled) {
                throw new Error('confirm-button not enabled yet');
              }
            }

            await sleep(300);
            await el.unwrap().click();
            didClick = true;
            throw new Error('waiting for confirm-button to leave hierarchy');
          },
          { maxRetries, interval: 1000 },
        );
      },
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
