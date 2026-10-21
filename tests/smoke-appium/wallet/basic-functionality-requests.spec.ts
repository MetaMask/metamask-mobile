import { merge } from 'lodash';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { waitForBasicFunctionalityRequests } from './basic-functionality-requests.helpers.js';

function buildFixture(basicFunctionalityEnabled: boolean) {
  const fixture = new FixtureBuilder().build();
  merge(fixture.state.settings, { basicFunctionalityEnabled });
  return fixture;
}

appiumTest.describe(SmokeWalletPlatform('Basic functionality requests'), () => {
  appiumTest.describe.configure({ timeout: 240_000 });

  appiumTest(
    'requests the selected RPC and MetaMask services when basic functionality is on',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildFixture(true),
          restartDevice: true,
          currentDeviceDetails,
        },
        async ({ mockServer }) => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await waitForBasicFunctionalityRequests(mockServer, true);
        },
      );
    },
  );

  appiumTest(
    'keeps only the selected RPC when basic functionality is off',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildFixture(false),
          restartDevice: true,
          currentDeviceDetails,
        },
        async ({ mockServer }) => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await waitForBasicFunctionalityRequests(mockServer, false, 45_000);
        },
      );
    },
  );
});
