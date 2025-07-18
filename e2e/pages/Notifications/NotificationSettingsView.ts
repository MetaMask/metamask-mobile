import {
  NotificationSettingsViewSelectorsIDs,
  NotificationSettingsViewSelectorsText,
} from '../../selectors/Notifications/NotificationSettingsView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { Assertions, Utilities } from '../../framework';

type ToggleState = 'on' | 'off';

interface ToggleConfig {
  element: DetoxElement;
  description: string;
  elemDescription: string;
}

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

  get featureAnnouncementsToggle() {
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

  private async toggleElement(
    config: ToggleConfig,
    expectedToggleState: ToggleState = 'on',
  ) {
    return Utilities.executeWithRetry(
      async () => {
        await Gestures.waitAndTap(config.element, {
          timeout: 2000,
          elemDescription: config.elemDescription,
        });

        const assertion =
          expectedToggleState === 'on'
            ? Assertions.expectToggleToBeOn
            : Assertions.expectToggleToBeOff;

        await assertion(config.element, {
          timeout: 2000,
        });
      },
      {
        timeout: 30000,
        description: `${config.description} and verify it is ${expectedToggleState}`,
        elemDescription: config.elemDescription,
      },
    );
  }

  // Checking the toggle state within the method due to flaky behavior

  async tapPushNotificationsToggleAndVerifyState(
    expectedToggleState: ToggleState,
  ) {
    return this.toggleElement(
      {
        element: this.pushNotificationsToggle,
        description: 'Tap Push Notifications Toggle',
        elemDescription: 'Notification Settings - Push Notifications Toggle',
      },
      expectedToggleState,
    );
  }

  async tapNotificationToggleAndVerifyState(expectedToggleState: ToggleState) {
    return this.toggleElement(
      {
        element: this.notificationToggle,
        description: 'Tap Notification Toggle',
        elemDescription: 'Notification Settings - Main Toggle',
      },
      expectedToggleState,
    );
  }

  async tapFeatureAnnouncementsToggleAndVerifyState(
    expectedToggleState: ToggleState,
  ) {
    return this.toggleElement(
      {
        element: this.featureAnnouncementsToggle,
        description: 'Tap Feature Announcements Toggle',
        elemDescription: 'Notification Settings - Feature Announcements Toggle',
      },
      expectedToggleState,
    );
  }

  async tapAccountNotificationsToggleAndVerifyState(
    address: string,
    expectedToggleState: ToggleState,
  ) {
    return this.toggleElement(
      {
        element: this.accountNotificationToggle(address),
        description: 'Tap Account Notifications Toggle',
        elemDescription: `Notification Settings - Account Notifications Toggle for ${address}`,
      },
      expectedToggleState,
    );
  }
}

export default new NotificationsSettingsView();
