import { EnableNotificationModalSelectorsIDs } from '../../../tests/selectors/Notifications/EnableNotificationModal.selectors';
import Gestures from '../../framework/Gestures.ts';
import Matchers from '../../framework/Matchers.ts';

class EnableNotificationsModal {
  get title() {
    return Matchers.getElementByID(EnableNotificationModalSelectorsIDs.TITLE);
  }
  get cancel_button() {
    return Matchers.getElementByID(
      EnableNotificationModalSelectorsIDs.BUTTON_CANCEL,
    );
  }
  get enable_button() {
    return Matchers.getElementByID(
      EnableNotificationModalSelectorsIDs.BUTTON_ENABLE,
    );
  }

  async tapOnConfirm() {
    await Gestures.waitAndTap(this.enable_button, {
      elemDescription: 'Confirm Enable Notifications',
    });
  }
}

export default new EnableNotificationsModal();
