import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  waitForAccountActivitySubscription,
  getAccountActivitySubscriptionCount,
  waitForAccountActivityDisconnection,
} from '../../websocket/account-activity-mocks';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import AccountMenu from '../../page-objects/AccountMenu/AccountMenu';
import SettingsView from '../../page-objects/Settings/SettingsView';

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message ?? `Expected ${String(expected)} but got ${String(actual)}`,
    );
  }
}

// Re-enabled on Android for MMQA-1923 S2 (device-level proxy active; this
// suite is the exit-gate evidence that native WSS routes through MockServerE2E
// on Android). Kept skipped on iOS: the device proxy is dormant on Detox iOS
// (see tests/framework/DEVICE_PROXY_MOCKING.md) and the suite was quarantined
// for flakiness (#30951). Re-evaluate the iOS gate when the Detox iOS proxy
// launch arg is activated.
const describeAndroidOnly =
  device.getPlatform() === 'android' ? describe : describe.skip;

describeAndroidOnly(
  SmokeWalletPlatform('Account Activity WebSocket Connection'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(2500000);
    });

    it('subscribes to account activity when user logs in', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
        },
        async () => {
          const subscriptionPromise = waitForAccountActivitySubscription();
          await loginToApp();
          await subscriptionPromise;
          assertEqual(
            getAccountActivitySubscriptionCount(),
            1,
            `Expected 1 account activity subscription but found ${getAccountActivitySubscriptionCount()}`,
          );
        },
      );
    });

    it('resubscribes after app resumes from background', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
        },
        async () => {
          const firstSubPromise = waitForAccountActivitySubscription();
          await loginToApp();
          await firstSubPromise;
          assertEqual(getAccountActivitySubscriptionCount(), 1);

          await device.sendToHome();
          await waitForAccountActivityDisconnection();

          const resubPromise = waitForAccountActivitySubscription();
          await device.launchApp({ newInstance: false });
          await resubPromise;
          assertEqual(
            getAccountActivitySubscriptionCount(),
            2,
            `Expected 2 total subscriptions but found ${getAccountActivitySubscriptionCount()}`,
          );
        },
      );
    });

    it('resubscribes after lock and unlock', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
        },
        async () => {
          const firstSubPromise = waitForAccountActivitySubscription();
          await loginToApp();
          await firstSubPromise;
          assertEqual(getAccountActivitySubscriptionCount(), 1);

          await TabBarComponent.tapAccountsMenu();
          await AccountMenu.tapLock();
          await SettingsView.tapYesAlertButton();
          await waitForAccountActivityDisconnection();

          const resubPromise = waitForAccountActivitySubscription();
          await loginToApp();
          await resubPromise;
          assertEqual(
            getAccountActivitySubscriptionCount(),
            2,
            `Expected 2 total subscriptions but found ${getAccountActivitySubscriptionCount()}`,
          );
        },
      );
    });
  },
);
