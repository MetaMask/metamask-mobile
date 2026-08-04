import { ConfirmationFooterSelectorIDs } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
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
        // Android needs extra pre-tap delay so toasts do not obscure the button
        await Gestures.waitAndTap(this.confirmButton, {
          elemDescription: 'Confirm button',
          delay: isAndroid ? 4800 : 1800,
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
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel button',
      delay: 1800,
    });
  }
}

export default new FooterActions();
