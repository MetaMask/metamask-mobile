/**
 * Shared fixture wrapper for Appium Snap smoke specs.
 *
 * Prefer a **release/main-e2e** build (`ANDROID_APK_PATH` / `IOS_APP_PATH`), not
 * a local debug Expo dev build. Debug builds require Metro and browser actions
 * can trigger the React Native developer menu — it can be dismissed manually
 * but is a nuisance and will flake automation.
 *
 * Session reuse:
 * - First test in a suite: `restartDevice: true` (default) + `loginAndOpenTestSnaps()`.
 * - Follow-up tests: `restartDevice: false` and do **not** login again — the
 * already-running app / Test Snaps page is preserved. Fixtures/mocks are not
 * re-applied on follow-ups; wallet/snap state carries over.
 *
 * Example:
 * ANDROID_APK_PATH=build/ci-main-e2e/app-prod-release.apk yarn appium-smoke:android tests/smoke-appium/snaps
 */
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import type { CurrentDeviceDetails } from '../../../framework/fixtures/playwright/index.js';
import type {
  LocalNodeOptionsInput,
  WithFixturesOptions,
} from '../../../framework/types.js';

interface SnapFixtureOptions {
  fixture?: ReturnType<FixtureBuilder['build']>;
  analyticsExpectations?: WithFixturesOptions['analyticsExpectations'];
  testSpecificMock?: WithFixturesOptions['testSpecificMock'];
  localNodeOptions?: LocalNodeOptionsInput;
  /**
   * When true (default), clear app data, relaunch, and bootstrap fixtures.
   * When false, keep the already-running Appium session / UI as-is.
   */
  restartDevice?: WithFixturesOptions['restartDevice'];
}

export async function withSnapsFixtures(
  currentDeviceDetails: CurrentDeviceDetails,
  options: SnapFixtureOptions,
  testFn: () => Promise<void>,
): Promise<void> {
  const {
    fixture = new FixtureBuilder().build(),
    analyticsExpectations,
    testSpecificMock,
    localNodeOptions,
    restartDevice = true,
  } = options;

  await withFixtures(
    {
      fixture,
      restartDevice,
      analyticsExpectations,
      testSpecificMock,
      localNodeOptions,
      currentDeviceDetails,
    },
    testFn,
  );
}
