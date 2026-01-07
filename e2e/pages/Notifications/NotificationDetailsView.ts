import { NotificationDetailsViewSelectorsIDs } from '../../../tests/selectors/Notifications/NotificationDetailsView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

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
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Notification Details - Back Button',
    });
  }
}

export default new NotificationsDetailView();
