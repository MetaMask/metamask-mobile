import type { MockttpServer } from 'mockttp';
import TestHelpers from '../../helpers';
import EnableNotificationsModal from '../../pages/Notifications/EnableNotificationsModal';
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
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';

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
        permissions: {
          notifications: 'YES',
        }
      },
      async ({ mockServer }: { mockServer: MockttpServer }) => {
        await mockNotificationServices(mockServer);
        await loginToApp();
        // Bell Icon
        await WalletView.tapBellIcon();

        // Enable Notifications Modal
        await Assertions.expectElementToBeVisible(
          EnableNotificationsModal.title,
        );
        await EnableNotificationsModal.tapOnConfirm();

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
