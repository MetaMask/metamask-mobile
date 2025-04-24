// @ts-check
import {
  NotificationSettingsViewSelectorsIDs,
  NotificationSettingsViewSelectorsText,
} from '../../selectors/Notifications/NotificationSettingsView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class NotificationsSettingsView {
  get notificationToggle() {
    return Matchers.getElementByID(
      NotificationSettingsViewSelectorsIDs.NOTIFICATIONS_TOGGLE,
    );
  }
  get pushNotificationsToggle() {
    return Matchers.getElementByID(
      NotificationSettingsViewSelectorsIDs.PUSH_NOTIFICATIONS_TOGGLE,
    );
  }
  get featureAnnonucementsToggle() {
    return Matchers.getElementByID(
      NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENTS_TOGGLE,
    );
  }
  get accountActivitySection() {
    return Matchers.getElementByText(
      NotificationSettingsViewSelectorsText.ACCOUNT_ACTIVITY_SECTION,
    );
  }
  accountNotificationToggle(
    /** @type {string} */
    address,
  ) {
    return Matchers.getElementByID(
      NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(address),
    );
  }

  async tapNotificationToggle() {
    await Gestures.waitAndTap(this.notificationToggle);
  }
  async tapPushNotificationsToggle() {
    await Gestures.waitAndTap(this.pushNotificationsToggle);
  }
  async tapFeatureAnnouncementsToggle() {
    await Gestures.waitAndTap(this.featureAnnonucementsToggle);
  }
  async tapAccountNotificationsToggle(
    /** @type {string} */
    address,
  ) {
    await Gestures.waitAndTap(this.accountNotificationToggle(address));
  }
}

export default new NotificationsSettingsView();
