import { ConfirmationFooterSelectorIDs } from '../../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';

class FooterActions {
  get confirmButton(): DetoxElement {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON)
      : Matchers.getElementByID(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON);
  }

  get cancelButton(): DetoxElement {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(ConfirmationFooterSelectorIDs.CANCEL_BUTTON)
      : Matchers.getElementByID(ConfirmationFooterSelectorIDs.CANCEL_BUTTON);
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm button',
    });
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel button',
    });
  }
}

export default new FooterActions();
