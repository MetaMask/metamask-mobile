import { NotificationDetailsViewSelectorsIDs } from '../../../app/components/Views/Notifications/Details/NotificationDetailsView.testIds';
import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

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
    await UnifiedGestures.waitAndTap(this.backButton, {
      elemDescription: 'Notification Details - Back Button',
    });
  }
}

export default new NotificationsDetailView();
