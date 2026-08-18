import { test as appiumTest } from '../../../../framework/fixtures/playwright/index.js';
import { SmokeNetworkExpansion } from '../../../../tags.js';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper.js';
import StellarTestDapp from '../../../../page-objects/Browser/StellarTestDapp.js';
import {
  account1Short,
  createStellarDappServer,
  startStellarDappServer,
  stellarFixture,
  stopStellarDappServer,
} from './fixtures.js';

const stellarDappServer = createStellarDappServer();

appiumTest.describe(SmokeNetworkExpansion('Stellar Wallet Standard'), () => {
  appiumTest.describe.configure({ timeout: 300_000 });

  appiumTest.beforeAll(async () => {
    await startStellarDappServer(stellarDappServer);
  });

  appiumTest.afterAll(async () => {
    await stopStellarDappServer(stellarDappServer);
  });

  appiumTest(
    'Stays connected after page refresh',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          ...stellarFixture,
          currentDeviceDetails,
        },
        async () => {
          await StellarTestDapp.setupAndNavigate();
          await StellarTestDapp.connect();

          await StellarTestDapp.verifyAccount(account1Short);
          await StellarTestDapp.verifyConnectionStatus('Connected');

          await StellarTestDapp.reload();

          await StellarTestDapp.verifyAccount(account1Short);
          await StellarTestDapp.verifyConnectionStatus('Connected');
        },
      );
    },
  );
});
