import type { Fixtures, TestInfo } from '@playwright/test';
import {
  attachAndroidDeviceLogs,
  clearAndroidLogBuffer,
  isAndroidDeviceLogCaptureEnabled,
} from '../../services/appium/AndroidDeviceLogs.ts';
import { createAppiumLogger } from '../../appiumLogger.ts';
import type {
  CurrentDeviceDetails,
  TestLevelFixtures,
  WorkerLevelFixtures,
} from './types.ts';

const logger = createAppiumLogger('androidDeviceLogs');

/**
 * Clears the Android log buffer before the test so a later dump covers this
 * attempt rather than the whole job, then on failure attaches the filtered
 * dump to the Playwright result (`android-device-logs.txt`), which reaches the
 * uploaded HTML report.
 *
 * Both steps are best-effort and never fail the test. iOS and cloud devices
 * (BrowserStack / TestMu) short-circuit to a no-op: there is no local adb.
 */
export const captureAndroidDeviceLogs = async (
  { currentDeviceDetails }: { currentDeviceDetails: CurrentDeviceDetails },
  // Playwright hands the test body to this fixture as its second argument.
  // Named `runTest` rather than the conventional `use`, which ESLint reads as
  // React's `use()` hook and rejects inside a try/catch (`rules-of-hooks`).
  runTest: () => Promise<void>,
  testInfo: TestInfo,
): Promise<void> => {
  const captureEnabled = isAndroidDeviceLogCaptureEnabled(currentDeviceDetails);
  const serial = captureEnabled ? currentDeviceDetails.udid : undefined;

  if (captureEnabled) {
    await clearAndroidLogBuffer(serial);
  }

  try {
    await runTest();
  } finally {
    if (captureEnabled) {
      try {
        await attachAndroidDeviceLogs(testInfo, { serial });
      } catch (error) {
        // `attachAndroidDeviceLogs` never throws; keep this guard so a future
        // change cannot mask the failure under test.
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to attach Android device logs: ${message}`);
      }
    }
  }
};

export const androidDeviceLogsFixture: Fixtures<
  TestLevelFixtures,
  WorkerLevelFixtures
> = {
  androidDeviceLogs: [captureAndroidDeviceLogs, { auto: true }],
};
