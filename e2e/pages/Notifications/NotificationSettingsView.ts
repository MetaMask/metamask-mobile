import {
  NotificationSettingsViewSelectorsIDs,
  NotificationSettingsViewSelectorsText,
} from '../../selectors/Notifications/NotificationSettingsView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

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
  accountNotificationToggle(address: string) {
    return Matchers.getElementByID(
      NotificationSettingsViewSelectorsIDs.ACCOUNT_NOTIFICATION_TOGGLE(address),
    );
  }

  async tapNotificationToggle() {
    await Gestures.waitAndTap(this.notificationToggle, {
      elemDescription: 'Notification Settings - Main Toggle',
      delay: 2000, // Toggle can take time to update state
    });
  }
  async tapPushNotificationsToggle() {
    await Gestures.waitAndTap(this.pushNotificationsToggle, {
      elemDescription: 'Notification Settings - Push Notifications Toggle',
      delay: 2000, // Toggle can take time to update state
    });
  }
  async tapFeatureAnnouncementsToggle() {
    await Gestures.waitAndTap(this.featureAnnonucementsToggle, {
      elemDescription: 'Notification Settings - Feature Announcements Toggle',
      delay: 2000, // Toggle can take time to update state
    });
  }
  async tapAccountNotificationsToggle(address: string) {
    await Gestures.waitAndTap(this.accountNotificationToggle(address), {
      elemDescription: `Notification Settings - Account Notifications Toggle for ${address}`,
      delay: 2000, // Toggle can take time to update state
    });
  }
}

export default new NotificationsSettingsView();
