import type { MockttpServer } from 'mockttp';
import TestHelpers from '../../helpers';
import { SmokeNetworkAbstractions } from '../../tags';
import Assertions from '../../framework/Assertions';
import {
  mockNotificationServices,
} from './utils/mocks';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder, { DEFAULT_FIXTURE_ACCOUNT } from '../../fixtures/fixture-builder';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import NotificationSettingsView from '../../pages/Notifications/NotificationSettingsView';

describe(SmokeNetworkAbstractions('Notification Onboarding'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('should enable notifications and view feature announcements and wallet notifications', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withBackupAndSyncSettings().build(),
        restartDevice: true,
        testSpecificMock: {},
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
        await NotificationSettingsView.tapNotificationToggle();

        // Verify sub-settings are enabled by default
        await Assertions.expectToggleToBeOn(
          NotificationSettingsView.pushNotificationsToggle,
        );
        await Assertions.expectToggleToBeOn(
          NotificationSettingsView.featureAnnonucementsToggle,
        );
        await Assertions.expectElementToBeVisible(
          NotificationSettingsView.accountActivitySection,
        );

        // Test push notifications toggle functionality
        await NotificationSettingsView.tapPushNotificationsToggle();
        await Assertions.expectToggleToBeOff(
          NotificationSettingsView.pushNotificationsToggle,
        );
        await NotificationSettingsView.tapPushNotificationsToggle();
        await Assertions.expectToggleToBeOn(
          NotificationSettingsView.pushNotificationsToggle,
        );

        // Test feature announcements toggle functionality
        await NotificationSettingsView.tapFeatureAnnouncementsToggle();
        await Assertions.expectToggleToBeOff(
          NotificationSettingsView.featureAnnonucementsToggle,
        );
        await NotificationSettingsView.tapFeatureAnnouncementsToggle();
        await Assertions.expectToggleToBeOn(
          NotificationSettingsView.featureAnnonucementsToggle,
        );

        // Test account notifications toggle functionality
        await NotificationSettingsView.tapAccountNotificationsToggle(
          DEFAULT_FIXTURE_ACCOUNT,
        );
        await Assertions.expectToggleToBeOff(
          NotificationSettingsView.accountNotificationToggle(DEFAULT_FIXTURE_ACCOUNT),
        );
        await NotificationSettingsView.tapAccountNotificationsToggle(
          DEFAULT_FIXTURE_ACCOUNT,
        );
        await Assertions.expectToggleToBeOn(
          NotificationSettingsView.accountNotificationToggle(DEFAULT_FIXTURE_ACCOUNT),
        );

        // Disable main toggle and verify all sub-settings are hidden
        await NotificationSettingsView.tapNotificationToggle();
        await Assertions.expectElementToNotBeVisible(
          NotificationSettingsView.pushNotificationsToggle as Promise<IndexableNativeElement>,
        );
        await Assertions.expectElementToNotBeVisible(
          NotificationSettingsView.featureAnnonucementsToggle as Promise<IndexableNativeElement>,
        );
        await Assertions.expectElementToNotBeVisible(
          NotificationSettingsView.accountActivitySection as Promise<IndexableNativeElement>,
        );
      },
    );
  });
});
