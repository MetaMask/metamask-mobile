import { ConfirmationFooterSelectorIDs } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import TestHelpers from '../../../helpers';
import { encapsulatedAction } from '../../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../../framework/PlaywrightGestures';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class FooterActions {
  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationFooterSelectorIDs.CANCEL_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationFooterSelectorIDs.CANCEL_BUTTON,
        ),
    });
  }

  async tapConfirmButton(timeout?: number): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        const isAndroid = device.getPlatform() === 'android';
        // Android needs extra delay to avoid element being obscured by bottom toast notifications
        // eslint-disable-next-line no-restricted-syntax
        if (isAndroid) await TestHelpers.delay(3000);
        await UnifiedGestures.waitAndTap(this.confirmButton, {
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

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel button',
      delay: 1800,
    });
  }
}

export default new FooterActions();
