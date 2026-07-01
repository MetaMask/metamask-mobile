import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../../flows/browser.flow.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import TestSnaps from '../../../page-objects/Browser/TestSnaps.js';
import type { CurrentDeviceDetails } from '../../../framework/fixtures/playwright/index.js';

interface SnapFixtureOptions {
  fixture?: ReturnType<FixtureBuilder['build']>;
  restartDevice?: boolean;
}

export async function withSnapsFixtures(
  currentDeviceDetails: CurrentDeviceDetails,
  options: SnapFixtureOptions,
  testFn: () => Promise<void>,
): Promise<void> {
  const { fixture = new FixtureBuilder().build(), restartDevice = true } =
    options;

  await withFixtures(
    {
      fixture,
      restartDevice,
      currentDeviceDetails,
    },
    async () => {
      if (restartDevice) {
        await loginToAppPlaywright({ scenarioType: 'e2e' });
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();
      }
      await testFn();
    },
  );
}
