import NotificationDetailsView from '../../pages/Notifications/NotificationDetailsView';
import NotificationMenuView from '../../pages/Notifications/NotificationMenuView';
import WalletView from '../../pages/wallet/WalletView';
import { SmokeNetworkAbstractions } from '../../tags';
import Assertions from '../../framework/Assertions';
import { loginToApp } from '../../viewHelper';
import {
  getMockFeatureAnnouncementItemId,
  getMockWalletNotificationItemIds,
  mockNotificationServices,
} from './utils/mocks';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { startMockServer } from '../../api-mocking/mock-server';
import { getMockServerPort } from '../../framework/fixtures/FixtureUtils';

describe(SmokeNetworkAbstractions('Notification Onboarding'), () => {
  let mockServer: Mockttp;

  beforeAll(async () => {
    jest.setTimeout(170000);
    const mockServerPort = getMockServerPort();
    mockServer = await startMockServer([], mockServerPort);
    await mockNotificationServices(mockServer);
  });

  it('should enable notifications and view feature announcements and wallet notifications', async () => {
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
        // Bell Icon
        await WalletView.tapBellIcon();

        await Assertions.expectElementToBeVisible(NotificationMenuView.title);
        await Assertions.expectElementToBeVisible(
          NotificationMenuView.selectNotificationItem(
            getMockFeatureAnnouncementItemId(),
          ),
        );

        // Feature Annonucement Details
        await NotificationMenuView.tapOnNotificationItem(
          getMockFeatureAnnouncementItemId(),
        );
        await Assertions.expectElementToBeVisible(
          NotificationDetailsView.title,
        );
        await NotificationDetailsView.tapOnBackButton();

        // Wallet Announcement Details
        const walletNotifications = getMockWalletNotificationItemIds();
        for (const walletNotificationId of walletNotifications) {
          await NotificationMenuView.scrollToNotificationItem(
            walletNotificationId,
          );
          await NotificationMenuView.tapOnNotificationItem(
            walletNotificationId,
          );
          await Assertions.expectElementToBeVisible(
            NotificationDetailsView.title,
          );
          await NotificationDetailsView.tapOnBackButton();
        }
      },
    );
  });
});
