/**
 * Shared fixture wrapper for Appium Snap smoke specs.
 *
 * Prefer a **release/main-e2e** build (`ANDROID_APK_PATH` / `IOS_APP_PATH`), not
 * a local debug Expo dev build. Debug builds require Metro and browser actions
 * can trigger the React Native developer menu — it can be dismissed manually
 * but is a nuisance and will flake automation.
 *
 * Example:
 * ANDROID_APK_PATH=build/ci-main-e2e/app-prod-release.apk yarn appium-smoke:android tests/smoke-appium/snaps
 */
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
