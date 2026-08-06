import type { CurrentDeviceDetails } from '../../fixtures/playwright';
import type { LaunchArgs } from '../../types.ts';
import {
  resolveE2EFixtureBootstrapTimeoutMs,
  shouldHandleMetroDevLauncherLocally,
} from '../../Constants.ts';
import AndroidWebViewCdpHelpers from '../../AndroidWebViewCdpHelpers.ts';
import PlaywrightUtilities from '../../PlaywrightUtilities.ts';
import { createPlaywrightLogger } from '../../playwrightLogger.ts';
import { dismissDevelopmentServerPickerPlaywright } from '../../../flows/general.flow';
import { switchToNativeContext } from './sessionHealth.ts';

const logger = createPlaywrightLogger('softReloadApp');

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

/**
 * Soft-reload the app on an existing Appium session for fixture re-bootstrap.
 *
 * Extract of the Appium `restartDevice: true` path:
 * clearAppData → NATIVE_APP context reset → launchApp → wait for /state.json.
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
  } = options;

  AndroidWebViewCdpHelpers.resetCache();

  let clearAppDataMs = 0;
  if (deviceCommands) {
    clearAppDataMs = await measureMs(() => deviceCommands.clearAppData());
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
      PlaywrightUtilities.launchApp(currentDeviceDetails, { launchArgs }),
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
    throw error;
  }

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
