import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import {
  waitForAccountActivitySubscription,
  waitForAccountActivityDisconnection,
} from '../../websocket/account-activity-mocks.js';
import PlaywrightGestures from '../../framework/PlaywrightGestures.js';
import {
  assertSubscriptionCountAtLeast,
  assertSubscriptionCountIncreased,
  LOGIN_SUBSCRIPTION_TIMEOUT_MS,
} from '../../helpers/account-activity/subscription.helpers.js';
import { sendAppToHome } from '../../helpers/account-activity/app-background.helpers.js';
import { lockApp } from '../seedless/helpers/seedless-helpers.js';

appiumTest.describe(
  SmokeWalletPlatform('Account Activity WebSocket Connection'),
  () => {
    appiumTest(
      'subscribes to account activity when user logs in',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            const subscriptionPromise = waitForAccountActivitySubscription(
              LOGIN_SUBSCRIPTION_TIMEOUT_MS,
            );
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await subscriptionPromise;
            assertSubscriptionCountAtLeast(1, 'after login');
          },
        );
      },
    );

    appiumTest(
      'resubscribes after app resumes from background',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            const firstSubPromise = waitForAccountActivitySubscription(
              LOGIN_SUBSCRIPTION_TIMEOUT_MS,
            );
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await firstSubPromise;
            const countAfterLogin = assertSubscriptionCountAtLeast(
              1,
              'after login',
            );

            await sendAppToHome();
            await waitForAccountActivityDisconnection();

            const resubPromise = waitForAccountActivitySubscription(
              LOGIN_SUBSCRIPTION_TIMEOUT_MS,
            );
            await PlaywrightGestures.activateApp(currentDeviceDetails);
            await resubPromise;
            assertSubscriptionCountIncreased(
              countAfterLogin,
              'app resumed from background',
            );
          },
        );
      },
    );

    appiumTest(
      'resubscribes after lock and unlock',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            const firstSubPromise = waitForAccountActivitySubscription(
              LOGIN_SUBSCRIPTION_TIMEOUT_MS,
            );
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await firstSubPromise;
            const countAfterLogin = assertSubscriptionCountAtLeast(
              1,
              'after login',
            );

            await lockApp();
            await waitForAccountActivityDisconnection();

            const resubPromise = waitForAccountActivitySubscription(
              LOGIN_SUBSCRIPTION_TIMEOUT_MS,
            );
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await resubPromise;
            assertSubscriptionCountIncreased(
              countAfterLogin,
              'lock and unlock',
            );
          },
        );
      },
    );
  },
);
