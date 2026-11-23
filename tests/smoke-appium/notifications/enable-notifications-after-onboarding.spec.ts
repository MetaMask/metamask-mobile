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
  appiumTest.describe.configure({ timeout: 240000 });

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
          const walletNotificationIds = getMockWalletNotificationItemIds();
          const firstWalletNotificationId = walletNotificationIds[0];

          await Assertions.expectElementToBeVisible(NotificationMenuView.title);
          await NotificationMenuView.waitForListReady();
          // FlatList virtualizes off-screen rows. A bare hierarchy existence
          // check for a wallet item can time out even after mocks merge — scroll
          // into view instead (bounded) to prove wallet rows are loaded.
          await NotificationMenuView.waitForNotificationItem(
            firstWalletNotificationId,
            { direction: 'down' },
          );
          // Feature announcements sit above wallet rows; after scrolling down,
          // seek the announcement upward.
          await NotificationMenuView.scrollToNotificationItem(
            featureAnnouncementItemId,
            { direction: 'up' },
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
          await NotificationMenuView.waitForListReady();
          await NotificationMenuView.waitForNotificationItem(
            firstWalletNotificationId,
            { direction: 'down' },
          );

          // Wallet Announcement Details
          // Check that notification details can be watched for some notifications
          // Reduced number of elements to test to avoid flakiness
          const walletNotifications = walletNotificationIds.slice(0, 3);
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
            await NotificationMenuView.waitForListReady();
          }

          // Check that all notifications are visible in the UI
          const foundIds: string[] = [];
          const otherNotifications = walletNotificationIds.slice(3);
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
