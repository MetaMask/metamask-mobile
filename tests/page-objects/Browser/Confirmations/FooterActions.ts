import { ConfirmationFooterSelectorIDs } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import Assertions from '../../../framework/Assertions';
import TestHelpers from '../../../helpers';
import { encapsulatedAction } from '../../../framework/encapsulatedAction';
import { EncapsulatedElementType } from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../../framework/PlaywrightGestures';

class FooterActions {
  get confirmButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
  }

  get cancelButton(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationFooterSelectorIDs.CANCEL_BUTTON);
  }

  async tapConfirmButton(timeout?: number): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const isAndroid = device.getPlatform() === 'android';
        // Android needs extra delay to avoid element being obscured by bottom toast notifications
        // eslint-disable-next-line no-restricted-syntax
        if (isAndroid) await TestHelpers.delay(3000);
        await Gestures.waitAndTap(this.confirmButton, {
          elemDescription: 'Confirm button',
          delay: 1800,
          timeout,
          waitForElementToDisappear: isAndroid,
        });
      },
      appium: async () => {
        const el = await PlaywrightMatchers.getElementById(
          ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
        );
        await PlaywrightGestures.waitAndTap(el, {
          timeout,
          checkForDisplayed: true,
          checkForEnabled: true,
        });
      },
    });
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
