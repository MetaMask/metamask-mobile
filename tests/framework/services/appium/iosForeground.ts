import { createAppiumLogger } from '../../appiumLogger.ts';
import { PlatformDetector } from '../../PlatformLocator.ts';
import { requestSharedSessionRecreate } from './sessionRecovery.ts';

const logger = createAppiumLogger('iosForeground');

/** XCUITest `mobile: queryAppState` values. */
const IOS_APP_STATE_BACKGROUND_SUSPENDED = 2;
const IOS_APP_STATE_BACKGROUND = 3;
const IOS_APP_STATE_FOREGROUND = 4;

/**
 * Reads the iOS app process state via XCUITest `mobile: queryAppState`.
 */
const queryIosAppState = async (
  drv: WebdriverIO.Browser,
  bundleId: string,
): Promise<number> =>
  Number(await drv.execute('mobile: queryAppState', { bundleId }));

/**
 * Soft-reload (and later waits) can leave SpringBoard showing while callers
 * burn fixture-bootstrap / onboarding / waitForAppReady budgets against the
 * home screen.
 *
 * Only a backgrounded process is activated: `activateApp` keeps the running
 * process and the `mobile: launchApp` fixture arguments it was started with.
 * When the app is not running, `activateApp` would cold-start it without those
 * arguments, so `/state.json` would never arrive. Fail fast instead and let
 * Playwright retry on a recreated session.
 *
 * Kept outside `softReloadApp.ts` / `general.flow.ts` to avoid a circular
 * import (soft-reload dismisses Metro picker via general.flow).
 */
export async function ensureIosAppInForeground(
  drv: WebdriverIO.Browser | undefined,
  bundleId: string | undefined,
  phase: string,
): Promise<void> {
  if (!drv || !bundleId || !PlatformDetector.isIOS()) {
    return;
  }

  let state = await queryIosAppState(drv, bundleId);
  if (state === IOS_APP_STATE_FOREGROUND) {
    return;
  }

  if (
    state === IOS_APP_STATE_BACKGROUND ||
    state === IOS_APP_STATE_BACKGROUND_SUSPENDED
  ) {
    logger.warn(
      `iOS app in background during ${phase} (state=${state}); ` +
        `activating ${bundleId}`,
    );
    // XCUITest activate returns once the app is in the foreground.
    await drv.activateApp(bundleId);
    state = await queryIosAppState(drv, bundleId);
    if (state === IOS_APP_STATE_FOREGROUND) {
      return;
    }
  }

  requestSharedSessionRecreate();
  throw new Error(
    `iOS app ${bundleId} not in foreground during ${phase} ` +
      `(queryAppState=${state}). Not relaunching without fixture launch ` +
      `arguments; failing fast instead of waiting on /state.json or app ready.`,
  );
}
