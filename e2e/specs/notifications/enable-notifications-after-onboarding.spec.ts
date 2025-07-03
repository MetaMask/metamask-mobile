import type { Mockttp } from 'mockttp';
import { startMockServer, stopMockServer } from '../../api-mocking/mock-server';
import TestHelpers from '../../helpers';
import EnableNotificationsModal from '../../pages/Notifications/EnableNotificationsModal';
import NotificationDetailsView from '../../pages/Notifications/NotificationDetailsView';
import NotificationMenuView from '../../pages/Notifications/NotificationMenuView';
import WalletView from '../../pages/wallet/WalletView';
import { SmokeNetworkAbstractions } from '../../tags';
import Assertions from '../../utils/Assertions';
import { loginToApp } from '../../viewHelper';
import { getFixturesServerPort, getMockServerPort } from '../../fixtures/utils';

import {
  getMockFeatureAnnouncementItemId,
  getMockWalletNotificationItemIds,
  mockNotificationServices,
} from './utils/mocks';
import FixtureServer from '../../fixtures/fixture-server';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { loadFixture, startFixtureServer, stopFixtureServer } from '../../fixtures/fixture-helper';

const fixtureServer = new FixtureServer();

const launchAppSettings = (mockServerPort: number, fixtureServerPort: number): DeviceLaunchAppConfig => ({
  newInstance: true,
  delete: true,
  permissions: {
    notifications: 'YES',
  },
  launchArgs: {
    mockServerPort,
    fixtureServerPort,
  },
});

describe(SmokeNetworkAbstractions('Notification Onboarding'), () => {
  let mockServer: Mockttp;

  beforeAll(async () => {
    jest.setTimeout(120000);  // Going through all notifications takes a while
    await TestHelpers.reverseServerPort();

    const fixture = new FixtureBuilder()
      .withDefaultFixture()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    const fixtureServerPort = getFixturesServerPort();

    // Mock Server
    const mockServerPort = getMockServerPort();
    mockServer = await startMockServer({}, mockServerPort);
    await mockNotificationServices(mockServer);

    // Launch App
    await TestHelpers.launchApp(launchAppSettings(mockServerPort, fixtureServerPort));
    await loginToApp();
  });

  afterAll(async () => {
    await stopMockServer(mockServer);
    await stopFixtureServer(fixtureServer);
  });

  it('enables notifications through bell icon', async () => {
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
      1500,  // Notifications even being mocked take a while to populate
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
