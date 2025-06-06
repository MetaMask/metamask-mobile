import type { DeviceLaunchAppConfig } from 'detox/detox';
import type { Mockttp } from 'mockttp';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import TestHelpers from '../../helpers';
import EnableNotificationsModal from '../../pages/Notifications/EnableNotificationsModal';
import NotificationDetailsView from '../../pages/Notifications/NotificationDetailsView';
import NotificationMenuView from '../../pages/Notifications/NotificationMenuView';
import WalletView from '../../pages/wallet/WalletView';
import { SmokeNetworkAbstractions } from '../../tags';
import Assertions from '../../utils/Assertions';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import {
  NOTIFICATIONS_TEAM_PASSWORD,
  NOTIFICATIONS_TEAM_SEED_PHRASE,
} from './utils/constants';
import {
  getMockFeatureAnnouncementItemId,
  getMockWalletNotificationItemIds,
  mockNotificationServices,
} from './utils/mocks';

const launchAppSettings = (port: number): DeviceLaunchAppConfig => ({
  newInstance: true,
  delete: true,
  permissions: {
    notifications: 'YES',
  },
  launchArgs: { mockServerPort: port },
});

describe(SmokeNetworkAbstractions('Notification Onboarding'), () => {
  let mockServer: Mockttp;

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

  it('enables notifications through bell icon', async () => {
    // Onboard - Import SRP
    await importWalletWithRecoveryPhrase({
      seedPhrase: NOTIFICATIONS_TEAM_SEED_PHRASE,
      password: NOTIFICATIONS_TEAM_PASSWORD,
    });

    // Bell Icon
    await WalletView.tapBellIcon();

    // Enable Notifications Modal
    await Assertions.checkIfVisible(EnableNotificationsModal.title);
    await EnableNotificationsModal.tapOnConfirm();
  });

  it('shows notifications visible in the notifications menu', async () => {
    // Notifications Menu
    await Assertions.checkIfVisible(NotificationMenuView.title);
    await Assertions.checkIfVisible(
      NotificationMenuView.selectNotificationItem(
        getMockFeatureAnnouncementItemId(),
      ),
    );
  });

  it('expands to the notification detail view when an item is pressed', async () => {
    // Feature Annonucement Details
    await NotificationMenuView.tapOnNotificationItem(
      getMockFeatureAnnouncementItemId(),
    );
    await Assertions.checkIfVisible(NotificationDetailsView.title);
    await NotificationDetailsView.tapOnBackButton();

    // Wallet Announcement Details
    const walletNotifications = getMockWalletNotificationItemIds();
    for (const walletNotificationId of walletNotifications) {
      await NotificationMenuView.scrollToNotificationItem(walletNotificationId);
      await TestHelpers.delay(1000);
      await NotificationMenuView.tapOnNotificationItem(walletNotificationId);
      await Assertions.checkIfVisible(NotificationDetailsView.title);
      await NotificationDetailsView.tapOnBackButton();
    }
  });
});
