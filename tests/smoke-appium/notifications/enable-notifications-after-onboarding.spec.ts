import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import NotificationDetailsView from '../../page-objects/Notifications/NotificationDetailsView.js';
import NotificationMenuView from '../../page-objects/Notifications/NotificationMenuView.js';
import { SmokeNetworkAbstractions } from '../../tags.js';
import Assertions from '../../framework/Assertions.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import {
  getMockFeatureAnnouncementItemId,
  getMockWalletNotificationItemIds,
} from './utils/mocks.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import AccountMenu from '../../page-objects/AccountMenu/AccountMenu.js';

appiumTest.describe(SmokeNetworkAbstractions('Notification Onboarding'), () => {
  appiumTest.describe.configure({ timeout: 180000 });

  // TODO: Update the test so if does a full e2e (define what should do). Keep this test to have something tested on e2e.
  appiumTest(
    'enable notifications and view feature announcements and wallet notifications',
    async ({ driver: _driver, currentDeviceDetails }) => {
      // Notification mocks are now enabled by default inside the fixture helper
      // since they're turned on by default
      await withFixtures(
        {
          fixture: new FixtureBuilder().withDefaultFixture().build(),
          restartDevice: true,
          permissions: {
            notifications: 'YES',
          },
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          // Notifications accessed via AccountsMenu (bell icon moved to hamburger menu)
          await TabBarComponent.tapAccountsMenu();
          await AccountMenu.tapNotifications();

          const featureAnnouncementItemId = getMockFeatureAnnouncementItemId();

          await Assertions.expectElementToBeVisible(NotificationMenuView.title);
          await NotificationMenuView.scrollToNotificationItem(
            featureAnnouncementItemId,
          );
          await Assertions.expectElementToBeVisible(
            NotificationMenuView.selectNotificationItem(
              featureAnnouncementItemId,
            ),
            {
              description: 'Feature Announcement Item',
            },
          );

          // Feature Announcement Details
          await NotificationMenuView.tapOnNotificationItem(
            featureAnnouncementItemId,
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
          const otherNotifications =
            getMockWalletNotificationItemIds().slice(3);
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
    },
  );
});
