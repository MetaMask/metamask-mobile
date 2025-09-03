import NotificationDetailsView from '../../pages/Notifications/NotificationDetailsView';
import NotificationMenuView from '../../pages/Notifications/NotificationMenuView';
import WalletView from '../../pages/wallet/WalletView';
import { SmokeNetworkAbstractions } from '../../tags';
import Assertions from '../../framework/Assertions';
import { loginToApp } from '../../viewHelper';
import {
  getMockFeatureAnnouncementItemId,
  getMockWalletNotificationItemIds,
} from './utils/mocks';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';

describe(SmokeNetworkAbstractions('Notification Onboarding'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
  });

  it('should enable notifications and view feature announcements and wallet notifications', async () => {
    // Notification mocks are now enabled by default inside the fixture helper
    // since they're turned on by default
    await withFixtures(
      {
        fixture: new FixtureBuilder().withBackupAndSyncSettings().build(),
        restartDevice: true,
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
          {
            description: 'Feature Announcement Item',
          },
        );

        // Feature Annonucement Details
        await NotificationMenuView.tapOnNotificationItem(
          getMockFeatureAnnouncementItemId(),
        );
        await Assertions.expectElementToBeVisible(
          NotificationDetailsView.title,
          {
            description: 'Feature Announcement Details',
          },
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
            {
              description: 'Wallet Announcement Details',
            },
          );
          await NotificationDetailsView.tapOnBackButton();
        }
      },
    );
  });
});
