import { NotificationDetailsViewSelectorsIDs } from '../../../app/components/Views/Notifications/Details/NotificationDetailsView.testIds';
import Gestures from '../../../tests/framework/Gestures';
import Matchers from '../../../tests/framework/Matchers';

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
