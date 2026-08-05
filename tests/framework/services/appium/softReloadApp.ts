import type { CurrentDeviceDetails } from '../../fixtures/playwright';
import type { LaunchArgs } from '../../types.ts';
import {
  resolveE2EFixtureBootstrapTimeoutMs,
  shouldHandleMetroDevLauncherLocally,
} from '../../Constants.ts';
import PlaywrightUtilities from '../../PlaywrightUtilities.ts';
import { createPlaywrightLogger } from '../../playwrightLogger.ts';
import { dismissDevelopmentServerPickerPlaywright } from '../../../flows/general.flow';
import { switchToNativeContext } from './sessionHealth.ts';
import {
  isDeviceHealthError,
  requestSharedSessionRecreate,
} from './sessionRecovery.ts';

const logger = createPlaywrightLogger('softReloadApp');

const DEFAULT_CLEAR_APP_DATA_RETRY_DELAY_MS = 1_000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    // Allow Jest / process exit when this timer loses a Promise.race.
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  });

/**
 * Minimal fixture-server surface needed for soft reload bootstrap wait.
 */
export interface SoftReloadFixtureServer {
  waitForNextStateRequest(timeoutMs?: number): Promise<void>;
}

/**
 * Minimal device-command surface for clearing app data before relaunch.
 * Optional install helpers enable recovery when the package disappears mid-suite.
 */
export interface SoftReloadDeviceCommands {
  clearAppData(): Promise<void>;
  isAppInstalled?(): Promise<boolean>;
  reinstallApp?(options: {
    buildPath: string;
    ignoreMissing?: boolean;
  }): Promise<void>;
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
  /**
   * Local APK / .app path used to reinstall when launch fails because the package
   * is missing or MainActivity cannot start. Optional — recovery is skipped when unset.
   */
  buildPath?: string;
  /**
   * Delay between clearAppData attempts. Defaults to 1000ms; tests may set 0.
   */
  clearAppDataRetryDelayMs?: number;
}

export interface SoftReloadAppForFixturesResult {
  clearAppDataMs: number;
  contextResetMs: number;
  launchAppMs: number;
  fixtureBootstrapMs: number;
  /** True when the Metro/dev-launcher picker dismissal loop ran during bootstrap. */
  attemptedMetroDevLauncherDismissal: boolean;
  /** True when clearAppData needed a second attempt. */
  clearAppDataRetried: boolean;
  /** True when a device-health launch failure triggered a reinstall + relaunch. */
  reinstalledAfterLaunchFailure: boolean;
}

async function measureMs(fn: () => Promise<void>): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

function markSessionForRecreate(error: unknown, fallbackReason: string): void {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : fallbackReason;
  requestSharedSessionRecreate(message);
}

async function clearAppDataWithRetry(
  deviceCommands: SoftReloadDeviceCommands,
  retryDelayMs: number,
): Promise<{ clearAppDataMs: number; clearAppDataRetried: boolean }> {
  const startedAt = Date.now();
  try {
    await deviceCommands.clearAppData();
    return {
      clearAppDataMs: Date.now() - startedAt,
      clearAppDataRetried: false,
    };
  } catch (firstError) {
    logger.warn(
      `clearAppData failed; retrying once after ${retryDelayMs}ms:`,
      firstError,
    );
    await sleep(retryDelayMs);
    try {
      await deviceCommands.clearAppData();
      return {
        clearAppDataMs: Date.now() - startedAt,
        clearAppDataRetried: true,
      };
    } catch (secondError) {
      markSessionForRecreate(secondError, 'clearAppData failed after retry');
      throw secondError;
    }
  }
}

/**
 * Reinstall when launch fails with a device-health error and a local build path
 * is available. Prefer checking install state when possible, but always reinstall
 * for missing-activity / cannot-start failures (CI cascade pattern).
 */
async function tryRecoverMissingAppLaunch(options: {
  deviceCommands?: SoftReloadDeviceCommands;
  buildPath?: string;
  launchError: unknown;
}): Promise<boolean> {
  const { deviceCommands, buildPath, launchError } = options;
  if (!deviceCommands?.reinstallApp || !buildPath?.trim()) {
    return false;
  }
  if (!isDeviceHealthError(launchError)) {
    return false;
  }

  const message =
    launchError instanceof Error ? launchError.message : String(launchError);
  const looksLikeMissingActivity =
    /MainActivity.*does not exist/i.test(message) ||
    /Cannot start the ['"].*['"] application/i.test(message);

  let shouldReinstall = looksLikeMissingActivity;
  if (!shouldReinstall && deviceCommands.isAppInstalled) {
    try {
      shouldReinstall = !(await deviceCommands.isAppInstalled());
    } catch (installCheckError) {
      logger.warn(
        'isAppInstalled failed during soft-reload recovery; attempting reinstall:',
        installCheckError,
      );
      shouldReinstall = true;
    }
  }

  if (!shouldReinstall) {
    return false;
  }

  logger.warn(
    `Soft-reload launch device-health failure; reinstalling from ${buildPath}`,
  );
  await deviceCommands.reinstallApp({
    buildPath: buildPath.trim(),
    ignoreMissing: true,
  });
  return true;
}

async function waitForBootstrap(options: {
  appStateRequest: Promise<void>;
  bootstrapStart: number;
}): Promise<{
  attemptedMetroDevLauncherDismissal: boolean;
  fixtureBootstrapMs: number;
}> {
  const { appStateRequest, bootstrapStart } = options;
  let attemptedMetroDevLauncherDismissal = false;

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

  return {
    attemptedMetroDevLauncherDismissal,
    fixtureBootstrapMs: Date.now() - bootstrapStart,
  };
}

/**
 * Soft-reload the app on an existing Appium session for fixture re-bootstrap.
 *
 * Extract of the Appium `restartDevice: true` path:
 * clearAppData → NATIVE_APP context reset → launchApp → wait for /state.json.
 *
 * Hardening behavior:
 * - Retry `clearAppData` once for transient adb flakes.
 * - On exhausted clearAppData / unrecovered launch device-health failures, mark
 * the shared WebDriver session for recreate so Playwright retries and later
 * tests do not cascade on a poisoned reused session.
 * - Optionally reinstall from `buildPath` when launch fails with missing app /
 * MainActivity device-health errors.
 */
export async function softReloadAppForFixtures(
  options: SoftReloadAppForFixturesOptions,
): Promise<SoftReloadAppForFixturesResult> {
  const {
    currentDeviceDetails,
    deviceCommands,
    launchArgs,
    fixtureServer,
    bootstrapTimeoutMs = resolveE2EFixtureBootstrapTimeoutMs(),
    drv = globalThis.driver,
    buildPath,
    clearAppDataRetryDelayMs = DEFAULT_CLEAR_APP_DATA_RETRY_DELAY_MS,
  } = options;

  let clearAppDataMs = 0;
  let clearAppDataRetried = false;
  if (deviceCommands) {
    const clearResult = await clearAppDataWithRetry(
      deviceCommands,
      clearAppDataRetryDelayMs,
    );
    clearAppDataMs = clearResult.clearAppDataMs;
    clearAppDataRetried = clearResult.clearAppDataRetried;
  }

  const contextResetMs = await measureMs(async () => {
    const switched = await switchToNativeContext(drv);
    if (!switched) {
      logger.debug('NATIVE_APP context reset skipped or failed (best-effort)');
    }
  });

  // Register waiter before launch so we do not miss a fast /state.json request.
  let appStateRequest =
    fixtureServer.waitForNextStateRequest(bootstrapTimeoutMs);

  let attemptedMetroDevLauncherDismissal = false;
  let launchAppMs = 0;
  let fixtureBootstrapMs = 0;
  let reinstalledAfterLaunchFailure = false;

  try {
    try {
      launchAppMs = await measureMs(() =>
        PlaywrightUtilities.launchApp(currentDeviceDetails, { launchArgs }),
      );
    } catch (launchError) {
      const recovered = await tryRecoverMissingAppLaunch({
        deviceCommands,
        buildPath,
        launchError,
      });
      if (!recovered) {
        throw launchError;
      }

      reinstalledAfterLaunchFailure = true;
      // Abandon the waiter registered before the failed launch.
      appStateRequest.catch(() => undefined);
      appStateRequest =
        fixtureServer.waitForNextStateRequest(bootstrapTimeoutMs);
      launchAppMs += await measureMs(() =>
        PlaywrightUtilities.launchApp(currentDeviceDetails, { launchArgs }),
      );
    }

    const bootstrap = await waitForBootstrap({
      appStateRequest,
      bootstrapStart: Date.now(),
    });
    attemptedMetroDevLauncherDismissal =
      bootstrap.attemptedMetroDevLauncherDismissal;
    fixtureBootstrapMs = bootstrap.fixtureBootstrapMs;
  } catch (error) {
    appStateRequest.catch(() => undefined);
    if (isDeviceHealthError(error)) {
      markSessionForRecreate(error, 'soft-reload bootstrap failed');
    }
    throw error;
  }

  logger.info(
    `Soft reload complete: clearAppData=${clearAppDataMs}ms` +
      `${clearAppDataRetried ? ' (retried)' : ''}, ` +
      `contextReset=${contextResetMs}ms, launchApp=${launchAppMs}ms, ` +
      `fixtureBootstrap=${fixtureBootstrapMs}ms` +
      (attemptedMetroDevLauncherDismissal
        ? ', metroDevLauncherDismissal=true'
        : '') +
      (reinstalledAfterLaunchFailure
        ? ', reinstalledAfterLaunchFailure=true'
        : ''),
  );

  return {
    clearAppDataMs,
    contextResetMs,
    launchAppMs,
    fixtureBootstrapMs,
    attemptedMetroDevLauncherDismissal,
    clearAppDataRetried,
    reinstalledAfterLaunchFailure,
  };
}
