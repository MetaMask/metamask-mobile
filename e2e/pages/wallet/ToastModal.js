import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../selectors/wallet/ToastModal.selectors';
import Gestures from '../../framework/Gestures.ts';
import Matchers from '../../framework/Matchers.ts';

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
    await Gestures.waitAndTap(this.toastCloseButton, {
      elemDescription: 'Toast Modal Close Button',
    });
  }
}

export default new ToastModal();
