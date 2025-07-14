import type { MockttpServer } from 'mockttp';
import TestHelpers from '../../helpers';
import { SmokeNetworkAbstractions } from '../../tags';
import Assertions from '../../framework/Assertions';
import { mockNotificationServices } from './utils/mocks';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../fixtures/fixture-builder';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import NotificationSettingsView from '../../pages/Notifications/NotificationSettingsView';

describe(SmokeNetworkAbstractions('Notification Onboarding'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('should enable notifications and toggle feature announcements and account notifications', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withBackupAndSyncSettings().build(),
        restartDevice: true,
        testSpecificMock: {},
        permissions: {
          notifications: 'YES',
        },
      },
      async ({ mockServer }: { mockServer: MockttpServer }) => {
        // Setup: Mock notification services and login
        await mockNotificationServices(mockServer);
        await loginToApp();

        // Navigate to notification settings
        await TabBarComponent.tapSettings();
        await SettingsView.tapNotifications();

        // Verify initial state - notifications should be disabled
        await Assertions.expectToggleToBeOff(
          NotificationSettingsView.notificationToggle,
        );

        // Enable main notification toggle
        await NotificationSettingsView.tapNotificationToggleAndVerifyState('on');

        // Test push notifications toggle functionality
        if (device.getPlatform() === 'android' || !process.env.CI ) {
          // Failing on iOS on CI
          await NotificationSettingsView.tapPushNotificationsToggleAndVerifyState('off');
          await NotificationSettingsView.tapPushNotificationsToggleAndVerifyState('on');
        }

        // Test feature announcements toggle functionality
        await NotificationSettingsView.tapFeatureAnnouncementsToggleAndVerifyState('off');
        await NotificationSettingsView.tapFeatureAnnouncementsToggleAndVerifyState('on');

        // Test account notifications toggle functionality
        await NotificationSettingsView.tapAccountNotificationsToggleAndVerifyState(
          DEFAULT_FIXTURE_ACCOUNT,
          'off',
        );
        await NotificationSettingsView.tapAccountNotificationsToggleAndVerifyState(
          DEFAULT_FIXTURE_ACCOUNT,
          'on',
        );

        // Disable main toggle and verify all sub-settings are hidden
        await NotificationSettingsView.tapNotificationToggleAndVerifyState('off');
        await Assertions.expectElementToNotBeVisible(
          NotificationSettingsView.pushNotificationsToggle,
        );
        await Assertions.expectElementToNotBeVisible(
          NotificationSettingsView.featureAnnouncementsToggle,
        );
        await Assertions.expectElementToNotBeVisible(
          NotificationSettingsView.accountActivitySection,
        );
      },
    );
  });
});
