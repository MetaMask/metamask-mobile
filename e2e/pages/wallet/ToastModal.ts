import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../selectors/wallet/ToastModal.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class ToastModal {
  get container(): DetoxElement {
    return Matchers.getElementByID(ToastSelectorsIDs.CONTAINER);
  }

  get notificationTitle(): DetoxElement {
    return Matchers.getElementByID(ToastSelectorsIDs.NOTIFICATION_TITLE);
  }

  get toastCloseButton(): DetoxElement {
    return Matchers.getElementByText(ToastSelectorsText.CLOSE_BUTTON);
  }

  async tapToastCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.toastCloseButton, {
      elemDescription: 'Toast Modal Close Button',
    });
  }
}

export default new ToastModal();
