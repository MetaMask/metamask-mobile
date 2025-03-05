import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../selectors/wallet/ToastModal.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class ToastModal {
  get container() {
    return Matchers.getElementByID(ToastSelectorsIDs.CONTAINER);
  }

  get notificationTitle() {
    return Matchers.getElementByID(ToastSelectorsIDs.NOTIFICATION_TITLE);
  }

  get toastCloseButton() {
    return Matchers.getElementByText(ToastSelectorsText.CLOSE_BUTTON);
  }

  async tapToastCloseButton() {
    await Gestures.waitAndTap(this.toastCloseButton);
  }
}

export default new ToastModal();
