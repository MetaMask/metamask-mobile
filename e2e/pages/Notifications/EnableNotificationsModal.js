// @ts-check
import { EnableNotificationModalSelectorsIDs } from '../../selectors/Notifications/EnableNotificationModal.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

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
    await Gestures.waitAndTap(this.enable_button);
  }
}

export default new EnableNotificationsModal();
