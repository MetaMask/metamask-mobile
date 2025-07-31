import { ConfirmationFooterSelectorIDs } from '../../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class FooterActions {
  get confirmButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON)
      : Matchers.getElementByID(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON);
  }

  get cancelButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(ConfirmationFooterSelectorIDs.CANCEL_BUTTON)
      : Matchers.getElementByID(ConfirmationFooterSelectorIDs.CANCEL_BUTTON);
  }

  async tapConfirmButton() {
    await Gestures.waitAndTap(this.confirmButton);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new FooterActions();
