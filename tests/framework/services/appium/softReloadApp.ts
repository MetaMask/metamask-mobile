import type { CurrentDeviceDetails } from '../../fixtures/playwright';
import type { LaunchArgs } from '../../types.ts';
import {
  DEFAULT_IMPLICIT_WAIT_MS,
  isUiAutomator2SessionDeadError,
  resolveE2EFixtureBootstrapTimeoutMs,
  shouldHandleMetroDevLauncherLocally,
} from '../../Constants.ts';
import AndroidWebViewCdpHelpers from '../../AndroidWebViewCdpHelpers.ts';
import ChromeCdpHelpers from '../../ChromeCdpHelpers.ts';
import AppiumUtilities from '../../AppiumUtilities.ts';
import { createAppiumLogger } from '../../appiumLogger.ts';
import { dismissDevelopmentServerPickerPlaywright } from '../../../flows/general.flow';
import { PlatformDetector } from '../../PlatformLocator.ts';
import { switchToNativeContext } from './sessionHealth.ts';
import {
  isDeviceHealthError,
  recreateSharedSessionNow,
  requestSharedSessionRecreate,
} from './sessionRecovery.ts';

const logger = createAppiumLogger('softReloadApp');

/** XCUITest `queryAppState`: 4 = running in foreground. */
const IOS_APP_STATE_FOREGROUND = 4;
const IOS_FOREGROUND_ATTEMPTS = 3;
const IOS_FOREGROUND_RETRY_MS = 1_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    // Allow Jest / process exit when this timer loses a Promise.race.
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  });

type QueryAppStateDriver = WebdriverIO.Browser & {
  queryAppState?: (bundleId: string) => Promise<number>;
};

/**
 * Reads iOS app process state. Prefer the WDIO helper; fall back to the
 * XCUITest `mobile: queryAppState` command.
 */
const queryIosAppState = async (
  drv: QueryAppStateDriver,
  bundleId: string,
): Promise<number> => {
  if (typeof drv.queryAppState === 'function') {
    return drv.queryAppState(bundleId);
  }
  const state = await drv.execute('mobile: queryAppState', { bundleId });
  return Number(state);
};

/**
 * Soft-reload can return from `launchApp` while SpringBoard is still showing
 * (MetaMask never reached the foreground). Callers then burn onboarding /
 * waitForAppReady / fixture-bootstrap budgets against the home screen.
 * Activate and re-check; fail fast so Playwright retry / session recreate can
 * heal instead of a multi-minute timeout.
 */
async function ensureIosAppInForeground(
  drv: WebdriverIO.Browser | undefined,
  bundleId: string | undefined,
  phase: string,
): Promise<void> {
  if (!drv || !bundleId || !PlatformDetector.isIOS()) {
    return;
  }

  const queryDrv = drv as QueryAppStateDriver;

  for (let attempt = 1; attempt <= IOS_FOREGROUND_ATTEMPTS; attempt++) {
    let state: number;
    try {
      state = await queryIosAppState(queryDrv, bundleId);
    } catch (error) {
      if (isDeviceHealthError(error)) {
        requestSharedSessionRecreate();
      }
      throw error;
    }

    if (state === IOS_APP_STATE_FOREGROUND) {
      if (attempt > 1) {
        logger.info(
          `iOS app reached foreground after activate (phase=${phase}, attempt=${attempt})`,
        );
      }
      return;
    }

    logger.warn(
      `iOS app not in foreground after soft-reload ${phase} ` +
        `(state=${state}, attempt=${attempt}/${IOS_FOREGROUND_ATTEMPTS}); ` +
        `activating ${bundleId}`,
    );
    await drv.activateApp(bundleId);
    await sleep(IOS_FOREGROUND_RETRY_MS);
  }

  const error = new Error(
    `iOS app ${bundleId} not in foreground after soft-reload ${phase} ` +
      `(${IOS_FOREGROUND_ATTEMPTS} activate attempts). Soft reload left ` +
      `SpringBoard; refusing to burn bootstrap/onboarding budgets.`,
  );
  requestSharedSessionRecreate();
  throw error;
}

/**
 * Soft-reload can leave the WDIO session alive while UiAutomator2 instrumentation
 * is dead. Element probes then burn the full waitForAppReady budget as false
 * "rehydration" timeouts. Fail fast and request session recreate.
 */
async function assertAndroidInstrumentationAlive(
  drv: WebdriverIO.Browser | undefined,
): Promise<void> {
  if (!drv || !PlatformDetector.isAndroid()) {
    return;
  }

  try {
    // Zero the implicit wait so the guaranteed-missing probe id returns
    // immediately on a healthy session instead of stalling for the full
    // DEFAULT_IMPLICIT_WAIT_MS.
    await drv.setTimeout({ implicit: 0 });
    try {
      // Any element command hits the instrumentation process. Use a cheap,
      // non-existent id so a healthy session returns quickly with no match.
      await drv.$('id=mm-soft-reload-uia2-health-probe').isExisting();
    } finally {
      await drv.setTimeout({ implicit: DEFAULT_IMPLICIT_WAIT_MS });
    }
  } catch (error) {
    if (isUiAutomator2SessionDeadError(error) || isDeviceHealthError(error)) {
      requestSharedSessionRecreate();
      throw error;
    }
    // Other lookup failures are unrelated to instrumentation liveness.
  }
}

/**
 * Minimal fixture-server surface needed for soft reload bootstrap wait.
 */
export interface SoftReloadFixtureServer {
  waitForNextStateRequest(timeoutMs?: number): Promise<void>;
}

/**
 * Minimal device-command surface for clearing app data before relaunch.
 */
export interface SoftReloadDeviceCommands {
  clearAppData(): Promise<void>;
}

export interface SoftReloadAppForFixturesOptions {
  currentDeviceDetails: CurrentDeviceDetails;
  deviceCommands?: SoftReloadDeviceCommands;
  launchArgs: Partial<LaunchArgs>;
  fixtureServer: SoftReloadFixtureServer;
  /**
   * Override bootstrap timeout. Defaults to resolveE2EFixtureBootstrapTimeoutMs().
   */
  bootstrapTimeoutMs?: number;
  /**
   * WDIO browser used for NATIVE_APP context reset. Defaults to globalThis.driver.
   */
  drv?: WebdriverIO.Browser;
}

export interface SoftReloadAppForFixturesResult {
  clearAppDataMs: number;
  contextResetMs: number;
  launchAppMs: number;
  fixtureBootstrapMs: number;
  /** True when the Metro/dev-launcher picker dismissal loop ran during bootstrap. */
  attemptedMetroDevLauncherDismissal: boolean;
}

async function measureMs(fn: () => Promise<void>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

async function softReloadAppForFixturesOnce(
  options: SoftReloadAppForFixturesOptions,
): Promise<SoftReloadAppForFixturesResult> {
  const {
    currentDeviceDetails,
    deviceCommands,
    launchArgs,
    fixtureServer,
    bootstrapTimeoutMs = resolveE2EFixtureBootstrapTimeoutMs(),
    drv = globalThis.driver,
  } = options;

  // Both caches key on the WebView socket, whose name embeds the app pid.
  AndroidWebViewCdpHelpers.resetCache();
  ChromeCdpHelpers.resetMetaMaskWebViewCache();

  let clearAppDataMs = 0;
  if (deviceCommands) {
    try {
      clearAppDataMs = await measureMs(async () => {
        try {
          await deviceCommands.clearAppData();
        } catch (firstError) {
          logger.warn('clearAppData failed; retrying once:', firstError);
          await sleep(1000);
          await deviceCommands.clearAppData();
        }
      });
    } catch (error) {
      if (isDeviceHealthError(error)) {
        requestSharedSessionRecreate();
      }
      throw error;
    }
  }

  const contextResetMs = await measureMs(async () => {
    const switched = await switchToNativeContext(drv);
    if (!switched) {
      logger.debug('NATIVE_APP context reset skipped or failed (best-effort)');
    }
  });

  // Register waiter before launch so we do not miss a fast /state.json request.
  const appStateRequest =
    fixtureServer.waitForNextStateRequest(bootstrapTimeoutMs);

  let attemptedMetroDevLauncherDismissal = false;
  let launchAppMs = 0;
  let fixtureBootstrapMs = 0;

  try {
    launchAppMs = await measureMs(() =>
      AppiumUtilities.launchApp(currentDeviceDetails, { launchArgs }),
    );

    // Before waiting on /state.json: a failed iOS launch leaves SpringBoard
    // and the bootstrap waiter burns up to E2E_FIXTURE_BOOTSTRAP_TIMEOUT_MS.
    await ensureIosAppInForeground(
      drv,
      currentDeviceDetails.appId,
      'post-launch',
    );

    const bootstrapStart = Date.now();
    if (shouldHandleMetroDevLauncherLocally()) {
      attemptedMetroDevLauncherDismissal = true;
      await Promise.all([
        appStateRequest,
        (async () => {
          for (;;) {
            await dismissDevelopmentServerPickerPlaywright();
            const bootstrapped = await Promise.race([
              appStateRequest.then(() => true),
              sleep(1500).then(() => false),
            ]);
            if (bootstrapped) {
              return;
            }
          }
        })(),
      ]);
    } else {
      await appStateRequest;
    }
    fixtureBootstrapMs = Date.now() - bootstrapStart;
  } catch (error) {
    appStateRequest.catch(() => undefined);
    if (isDeviceHealthError(error)) {
      requestSharedSessionRecreate();
    }
    throw error;
  }

  // After bootstrap the process can still drop to background / SpringBoard
  // before login or onboarding waits begin.
  await ensureIosAppInForeground(
    drv,
    currentDeviceDetails.appId,
    'post-bootstrap',
  );

  await assertAndroidInstrumentationAlive(drv);

  logger.info(
    `Soft reload complete: clearAppData=${clearAppDataMs}ms, ` +
      `contextReset=${contextResetMs}ms, launchApp=${launchAppMs}ms, ` +
      `fixtureBootstrap=${fixtureBootstrapMs}ms` +
      (attemptedMetroDevLauncherDismissal
        ? ', metroDevLauncherDismissal=true'
        : ''),
  );

  return {
    clearAppDataMs,
    contextResetMs,
    launchAppMs,
    fixtureBootstrapMs,
    attemptedMetroDevLauncherDismissal,
  };
}

/**
 * Soft-reload the app on an existing Appium session for fixture re-bootstrap.
 *
 * Extract of the Appium `restartDevice: true` path:
 * clearAppData → NATIVE_APP context reset → launchApp → wait for /state.json.
 *
 * When UiAutomator2 (or other device-health) dies mid soft-reload, recreate the
 * shared WebDriver session in-process (same Playwright attempt) and retry once
 * so the health report does not count a flake that Playwright retry would heal.
 */
export async function softReloadAppForFixtures(
  options: SoftReloadAppForFixturesOptions,
): Promise<SoftReloadAppForFixturesResult> {
  try {
    return await softReloadAppForFixturesOnce(options);
  } catch (error) {
    if (!isDeviceHealthError(error)) {
      throw error;
    }

    requestSharedSessionRecreate();
    const recreatedDrv = await recreateSharedSessionNow();
    if (!recreatedDrv) {
      throw error;
    }

    logger.warn(
      'Soft reload hit a device-health error; retrying once after in-process session recreate',
      error,
    );

    return softReloadAppForFixturesOnce({
      ...options,
      drv: recreatedDrv,
    });
  }
}
