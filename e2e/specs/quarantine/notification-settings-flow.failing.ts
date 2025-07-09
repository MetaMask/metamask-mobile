import type {
  DeviceLaunchAppConfig,
  IndexableNativeElement,
} from 'detox/detox';
import type { Mockttp } from 'mockttp';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import TestHelpers from '../../helpers';
import NotificationSettingsView from '../../pages/Notifications/NotificationSettingsView';
import SettingsView from '../../pages/Settings/SettingsView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { SmokeNetworkAbstractions } from '../../tags';
import Assertions from '../../utils/Assertions';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import { getMockServerPort } from '../../fixtures/utils';
import {
  NOTIFICATION_WALLET_ACCOUNT_1,
  NOTIFICATIONS_TEAM_PASSWORD,
  NOTIFICATIONS_TEAM_SEED_PHRASE,
} from '../notifications/utils/constants';
import { mockNotificationServices } from '../notifications/utils/mocks';

const launchAppSettings = (port: number): DeviceLaunchAppConfig => ({
  newInstance: true,
  delete: true,
  permissions: {
    notifications: 'YES',
  },
  launchArgs: { mockServerPort: port },
});

describe(SmokeNetworkAbstractions('Notification Settings Flow'), () => {
  let mockServer: Mockttp;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();

    // Mock Server
    mockServer = await startMockServer({}, getMockServerPort());
    await mockNotificationServices(mockServer);

    // Launch App
    await TestHelpers.launchApp(launchAppSettings(mockServer.port));
  });

  afterAll(async () => {
    await stopMockServer(mockServer);
  });

  it('navigates to notification settings page', async () => {
    // Onboard - Import SRP
    await importWalletWithRecoveryPhrase({
      seedPhrase: NOTIFICATIONS_TEAM_SEED_PHRASE,
      password: NOTIFICATIONS_TEAM_PASSWORD,
    });

    // navigate to notification settings
    await TabBarComponent.tapSettings();
    await SettingsView.tapNotifications();
  });

  it('enables notifications toggle', async () => {
    await NotificationSettingsView.tapNotificationToggle();
    await TestHelpers.delay(2000);
    await Assertions.checkIfVisible(
      NotificationSettingsView.pushNotificationsToggle,
    );
    await Assertions.checkIfVisible(
      NotificationSettingsView.featureAnnonucementsToggle,
    );
    await Assertions.checkIfVisible(
      NotificationSettingsView.accountActivitySection,
    );
  });

  it('toggles push notification switch on and off', async () => {
    await NotificationSettingsView.tapPushNotificationsToggle();
    await TestHelpers.delay(2000);
    await NotificationSettingsView.tapPushNotificationsToggle();
    await TestHelpers.delay(2000);
  });

  it('toggles feature announcement switch on and off', async () => {
    await NotificationSettingsView.tapFeatureAnnouncementsToggle();
    await TestHelpers.delay(2000);
    await NotificationSettingsView.tapFeatureAnnouncementsToggle();
    await TestHelpers.delay(2000);
  });

  it('toggles account notifications switch on and off', async () => {
    await NotificationSettingsView.tapAccountNotificationsToggle(
      NOTIFICATION_WALLET_ACCOUNT_1,
    );
    TestHelpers.delay(5000);
    await NotificationSettingsView.tapAccountNotificationsToggle(
      NOTIFICATION_WALLET_ACCOUNT_1,
    );
    TestHelpers.delay(5000);
  });

  it('disables notifications', async () => {
    await NotificationSettingsView.tapNotificationToggle();
    await TestHelpers.delay(2000);
    await Assertions.checkIfNotVisible(
      NotificationSettingsView.pushNotificationsToggle as Promise<IndexableNativeElement>,
    );
    await Assertions.checkIfNotVisible(
      NotificationSettingsView.featureAnnonucementsToggle as Promise<IndexableNativeElement>,
    );
    await Assertions.checkIfNotVisible(
      NotificationSettingsView.accountActivitySection as Promise<IndexableNativeElement>,
    );
  });
});
