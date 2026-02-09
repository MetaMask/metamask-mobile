import {
  ToastSelectorsIDs,
  ToastSelectorsText,
} from '../../../app/component-library/components/Toast/ToastModal.testIds.ts';
import Gestures from '../../framework/Gestures.ts';
import Matchers from '../../framework/Matchers.ts';

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
