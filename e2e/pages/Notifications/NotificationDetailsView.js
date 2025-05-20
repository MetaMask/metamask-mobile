// @ts-check
import { NotificationDetailsViewSelectorsIDs } from '../../selectors/Notifications/NotificationDetailsView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class NotificationsDetailView {
  get title() {
    return Matchers.getElementByID(NotificationDetailsViewSelectorsIDs.TITLE);
  }
  get backButton() {
    return Matchers.getElementByID(
      NotificationDetailsViewSelectorsIDs.BACK_BUTTON,
    );
  }

  async tapOnBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }
}

export default new NotificationsDetailView();
