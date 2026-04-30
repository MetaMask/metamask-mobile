import { test } from '../../framework/fixture/index';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';

/* Scenario: Test Fixtures */
test.describe(`TEST FIXTURES`, () => {
  test('Test Fixtures', async ({
    currentDeviceDetails,
    driver,
    performanceTracker,
  }, testInfo) => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToAppPlaywright();
        await new Promise((resolve) => setTimeout(resolve, 10000));
      },
    );
  });
});
