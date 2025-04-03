// @ts-check
import {
  startMockServer,
  stopMockServer,
} from '../../../api-mocking/mock-server';
import TestHelpers from '../../../helpers';
import WalletView from '../../../pages/wallet/WalletView';
import { SmokeNotifications } from '../../../tags';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import Assertions from '../../../utils/Assertions';
import {
  NOTIFICATIONS_TEAM_PASSWORD,
  NOTIFICATIONS_TEAM_SEED_PHRASE,
} from '../utils/constants';
import {
  getMockFeatureAnnouncementItemId,
  getMockWalletNotificationItemId,
  mockNotificationServices,
} from '../utils/mocks';
import EnableNotificationsModal from '../../../pages/Notifications/EnableNotificationsModal';
import NotificationMenuView from '../../../pages/Notifications/NotificationMenuView';

/** @type {import('detox/detox').DeviceLaunchAppConfig} */
const launchAppSettings = {
  newInstance: true,
  delete: true,
  permissions: {
    notifications: 'YES',
  },
};

describe(SmokeNotifications('Notification Onboarding'), () => {
  /** @type {import('mockttp').Mockttp} */
  let mockServer;

  beforeAll(async () => {
    jest.setTimeout(200000);
    await TestHelpers.reverseServerPort();

    // Mock Server
    mockServer = await startMockServer({});
    await mockNotificationServices(mockServer);

    // Launch App
    await TestHelpers.launchApp(launchAppSettings);
  });

  afterAll(async () => {
    await stopMockServer(mockServer);
  });

  it('enables notifications through bell icon', async () => {
    // Onboard - Import SRP
    await importWalletWithRecoveryPhrase(
      NOTIFICATIONS_TEAM_SEED_PHRASE,
      NOTIFICATIONS_TEAM_PASSWORD,
    );

    // Bell Icon
    await WalletView.tapBellIcon();

    // Enable Notifications Modal
    await Assertions.checkIfVisible(EnableNotificationsModal.title);
    await EnableNotificationsModal.tapOnConfirm();

    // Notifications Menu
    await Assertions.checkIfVisible(NotificationMenuView.title);
    await Assertions.checkIfVisible(
      NotificationMenuView.selectNotificationItem(
        getMockWalletNotificationItemId(),
      ),
    );
    await Assertions.checkIfVisible(
      NotificationMenuView.selectNotificationItem(
        getMockFeatureAnnouncementItemId(),
      ),
    );
  });
});
