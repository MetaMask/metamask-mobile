import type { TestInfo } from '@playwright/test';
import { getDriver } from '../../framework/AppiumUtilities';
import { resolveTestMuPreLaunchSettleMs } from '../../framework/Constants';
import { sleep } from '../../framework/Utilities';
import { createLogger } from '../../framework/logger';
import type { CurrentDeviceDetails } from '../../framework/fixtures/playwright';

const logger = createLogger({ name: 'launchAppInTest' });

/** Appium `queryAppState`: the app is installed and not running. */
export const APP_STATE_NOT_RUNNING = 1;

/** Annotation that records the app state read before the in-test launch. */
export const APP_STATE_BEFORE_LAUNCH_ANNOTATION = 'appStateBeforeLaunch';

/**
 * Runs before a launch-time timer when `TESTMU_LAUNCH_IN_TEST=true`, outside
 * the timed interval.
 *
 * 1. Reads the app state and records it on the test as the
 * `appStateBeforeLaunch` annotation. The session was created with
 * `appium:autoLaunch: false`, so the app must be installed and not running. Any
 * other state means session creation launched it (or did not install it), the
 * timer cannot contain the launch, and this throws instead of letting a value
 * be recorded.
 * 2. Waits `TESTMU_PRE_LAUNCH_SETTLE_SECONDS` (default 0) for the device to
 * settle after install.
 *
 * @param currentDeviceDetails - Device details for the session under test.
 * @param testInfo - Playwright test info, for the annotation.
 */
export async function prepareInTestLaunch(
  currentDeviceDetails: CurrentDeviceDetails,
  testInfo: Pick<TestInfo, 'annotations'>,
): Promise<void> {
  // Parse first, so a bad value fails before any device command.
  const settleMs = resolveTestMuPreLaunchSettleMs();

  const appId =
    currentDeviceDetails.platform === 'android'
      ? currentDeviceDetails.packageName
      : currentDeviceDetails.appId;
  if (!appId) {
    throw new Error('Package name or app id is not available');
  }

  const appState = await getDriver().queryAppState(appId);
  testInfo.annotations.push({
    type: APP_STATE_BEFORE_LAUNCH_ANNOTATION,
    description: String(appState),
  });
  logger.info(`App state of ${appId} before the in-test launch: ${appState}`);

  if (appState !== APP_STATE_NOT_RUNNING) {
    throw new Error(
      `TESTMU_LAUNCH_IN_TEST=true, but ${appId} was in app state ${appState} before the in-test launch ` +
        `(expected ${APP_STATE_NOT_RUNNING}: installed and not running). ` +
        'The launch timer would not contain the launch, so no value is recorded.',
    );
  }

  if (settleMs > 0) {
    logger.info(
      `Waiting ${settleMs}ms after install before the in-test launch (TESTMU_PRE_LAUNCH_SETTLE_SECONDS)`,
    );
    await sleep(settleMs);
  }
}
