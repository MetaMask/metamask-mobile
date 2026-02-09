import NotificationDetailsView from '../../../e2e/pages/Notifications/NotificationDetailsView';
import NotificationMenuView from '../../../e2e/pages/Notifications/NotificationMenuView';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import { SmokeNetworkAbstractions } from '../../../e2e/tags';
import Assertions from '../../framework/Assertions';
import { loginToApp } from '../../../e2e/viewHelper';
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
        fixture: new FixtureBuilder().withDefaultFixture().build(),
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
        // Check that notification details can be watched for some notifications
        // Reduced number of elements to test to avoid flakiness
        const walletNotifications = getMockWalletNotificationItemIds().slice(
          0,
          3,
        );
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

        // Check that all notifications are visible in the UI
        const foundIds: string[] = [];
        const otherNotifications = getMockWalletNotificationItemIds().slice(3);
        for (const id of otherNotifications) {
          await NotificationMenuView.scrollToNotificationItem(id);
          await Assertions.expectElementToBeVisible(
            NotificationMenuView.selectNotificationItem(id),
            { description: `wallet notification ${id} visible` },
          );
          foundIds.push(id);
        }
        await Assertions.checkIfArrayHasLength(
          foundIds,
          otherNotifications.length,
        );
      },
    );
  });
});
