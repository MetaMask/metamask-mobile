import { test } from '../../framework/fixture/index';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';

/* Scenario: Test Fixtures */
test('Test Fixtures', async ({ currentDeviceDetails, driver }, testInfo) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder().build(),
      restartDevice: true,
      currentDeviceDetails,
    },
    async () => {
      console.log('currentDeviceDetails', currentDeviceDetails);
      await loginToAppPlaywright({ scenarioType: 'e2e' });
      await new Promise((resolve) => setTimeout(resolve, 10000));
    },
  );
});
