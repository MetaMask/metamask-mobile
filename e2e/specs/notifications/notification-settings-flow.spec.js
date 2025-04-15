// @ts-check
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import TestHelpers from '../../helpers';
import NotificationSettingsView from '../../pages/Notifications/NotificationSettingsView';
import SettingsView from '../../pages/Settings/SettingsView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { SmokeNotifications } from '../../tags';
import Assertions from '../../utils/Assertions';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import {
  NOTIFICATION_WALLET_ACCOUNT_1,
  NOTIFICATIONS_TEAM_PASSWORD,
  NOTIFICATIONS_TEAM_SEED_PHRASE,
} from './utils/constants';
import { mockNotificationServices } from './utils/mocks';

/**
 * @param {number} port
 * @returns {import('detox/detox').DeviceLaunchAppConfig}
 */
const launchAppSettings = (port) => ({
  newInstance: true,
  delete: true,
  permissions: {
    notifications: 'YES',
  },
  launchArgs: { mockServerPort: port },
});

describe(SmokeNotifications('Notification Settings Flow'), () => {
  /** @type {import('mockttp').Mockttp} */
  let mockServer;

  beforeAll(async () => {
    jest.setTimeout(200000);
    await TestHelpers.reverseServerPort();

    // Mock Server
    mockServer = await startMockServer({});
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
    TestHelpers.delay(2000);
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
    TestHelpers.delay(2000);
    await NotificationSettingsView.tapPushNotificationsToggle();
    TestHelpers.delay(2000);
  });

  it('toggles feature announcement switch on and off', async () => {
    await NotificationSettingsView.tapFeatureAnnouncementsToggle();
    TestHelpers.delay(2000);
    await NotificationSettingsView.tapFeatureAnnouncementsToggle();
    TestHelpers.delay(2000);
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
    TestHelpers.delay(2000);
    await Assertions.checkIfNotVisible(
      /** @type {Promise<import('detox/detox').IndexableNativeElement>} */ (
        NotificationSettingsView.pushNotificationsToggle
      ),
    );
    await Assertions.checkIfNotVisible(
      /** @type {Promise<import('detox/detox').IndexableNativeElement>} */ (
        NotificationSettingsView.featureAnnonucementsToggle
      ),
    );
    await Assertions.checkIfNotVisible(
      /** @type {Promise<import('detox/detox').IndexableNativeElement>} */ (
        NotificationSettingsView.accountActivitySection
      ),
    );
  });
});
