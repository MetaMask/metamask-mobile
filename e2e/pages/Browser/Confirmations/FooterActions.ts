import { ConfirmationFooterSelectorIDs } from '../../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';

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
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm button',
      delay: 1800,
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
