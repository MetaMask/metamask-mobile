import {
  NotificationSettingsViewSelectorsIDs,
  NotificationSettingsViewSelectorsText,
} from '../../../app/components/Views/Settings/NotificationsSettings/NotificationSettingsView.testIds';
import Gestures from '../../../tests/framework/Gestures';
import Matchers from '../../../tests/framework/Matchers';
import { Assertions, Utilities } from '../../../tests/framework';

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

  get featureAnnouncementSeparator() {
    return Matchers.getElementByID(
      NotificationSettingsViewSelectorsIDs.FEATURE_ANNOUNCEMENT_SEPARATOR,
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
        const assertOn = Assertions.expectToggleToBeOn;
        const assertOff = Assertions.expectToggleToBeOff;

        // Short read with graceful fallback on platforms where toggle state is flaky
        const isAlreadyInState = async (): Promise<boolean> => {
          try {
            if (expectedToggleState === 'on') {
              await assertOn(config.element, { timeout: 500 });
            } else {
              await assertOff(config.element, { timeout: 500 });
            }
            return true;
          } catch {
            return false;
          }
        };

        if (await isAlreadyInState()) {
          return;
        }

        await Gestures.waitAndTap(config.element, {
          timeout: 3000,
          checkEnabled: false,
          elemDescription: config.elemDescription,
        });

        // Verify expected state with a more generous timeout
        if (expectedToggleState === 'on') {
          await assertOn(config.element, { timeout: 5000 });
        } else {
          await assertOff(config.element, { timeout: 5000 });
        }
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
