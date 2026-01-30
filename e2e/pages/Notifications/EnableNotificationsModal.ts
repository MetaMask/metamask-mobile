import { EnableNotificationModalSelectorsIDs } from '../../../app/components/Views/Notifications/OptIn/EnableNotificationModal.testIds';
import Gestures from '../../../tests/framework/Gestures.ts';
import Matchers from '../../../tests/framework/Matchers.ts';

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
