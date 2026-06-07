import { test as appiumTest } from '../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../tags.js';
import { loginToAppPlaywright } from '../flows/wallet.flow.js';
import TabBarComponent from '../page-objects/wallet/TabBarComponent.js';
import FixtureBuilder from '../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../framework/fixtures/FixtureHelper.js';

appiumTest.describe(SmokeAccounts('Login to app'), () => {
  appiumTest(
    'logs in successfully',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({
            scenarioType: 'e2e',
          });
          await TabBarComponent.tapHome();
        },
      );
    },
  );
});
