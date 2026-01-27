import { ConfirmationFooterSelectorIDs } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../../tests/framework/Matchers';
import Gestures from '../../../../tests/framework/Gestures';
import TestHelpers from '../../../helpers';

class FooterActions {
  get confirmButton(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByID(ConfirmationFooterSelectorIDs.CANCEL_BUTTON);
  }

  async tapConfirmButton(): Promise<void> {
    const isAndroid = device.getPlatform() === 'android';
    // Android needs extra delay to avoid element being obscured by bottom toast notifications
    // eslint-disable-next-line no-restricted-syntax
    if (isAndroid) await TestHelpers.delay(3000);
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm button',
      delay: 1800,
      waitForElementToDisappear: isAndroid,
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
