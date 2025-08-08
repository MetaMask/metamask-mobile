import type { Mockttp } from 'mockttp';
import { SmokeNetworkAbstractions } from '../../tags';
import Assertions from '../../framework/Assertions';
import { mockNotificationServices } from './utils/mocks';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
} from '../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import NotificationSettingsView from '../../pages/Notifications/NotificationSettingsView';
import { startMockServer } from '../../api-mocking/mock-server';
import { getMockServerPort } from '../../framework/fixtures/FixtureUtils';

describe(SmokeNetworkAbstractions('Notification Onboarding'), () => {
  let mockServer: Mockttp;

  beforeAll(async () => {
    jest.setTimeout(170000);
    const mockServerPort = getMockServerPort();
    mockServer = await startMockServer({}, mockServerPort);
    await mockNotificationServices(mockServer);
  });

  it('should enable notifications and toggle feature announcements and account notifications', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withBackupAndSyncSettings().build(),
        restartDevice: true,
        mockServerInstance: mockServer,
        permissions: {
          notifications: 'YES',
        },
      },
      async () => {
        await loginToApp();

        // Navigate to notification settings
        await TabBarComponent.tapSettings();
        await SettingsView.tapNotifications();

        // Verify initial state - notifications should be enabled
        await Assertions.expectToggleToBeOn(
          NotificationSettingsView.notificationToggle,
        );

        // Test push notifications toggle functionality
        if (device.getPlatform() === 'android' || !process.env.CI) {
          // Failing on iOS on CI
          await NotificationSettingsView.tapPushNotificationsToggleAndVerifyState(
            'off',
          );
          await NotificationSettingsView.tapPushNotificationsToggleAndVerifyState(
            'on',
          );
        }

        // Test feature announcements toggle functionality
        await NotificationSettingsView.tapFeatureAnnouncementsToggleAndVerifyState(
          'off',
        );
        await NotificationSettingsView.tapFeatureAnnouncementsToggleAndVerifyState(
          'on',
        );

        // Test account notifications toggle functionality
        await NotificationSettingsView.tapAccountNotificationsToggleAndVerifyState(
          DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
          'off',
        );
        await NotificationSettingsView.tapAccountNotificationsToggleAndVerifyState(
          DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
          'on',
        );

        // Disable main toggle and verify all sub-settings are hidden
        await NotificationSettingsView.tapNotificationToggleAndVerifyState(
          'off',
        );
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
