import test from '@playwright/test';
import type { DeviceMatrix, LaunchArgs } from './types';
import { getWindowSize } from './DeviceInfoCache.ts';
import { PlaywrightElement } from './PlaywrightAdapter';
import {
  CHROME_PACKAGE,
  DEFAULT_IMPLICIT_WAIT_MS,
  FALLBACK_FIXTURE_SERVER_PORT,
  FALLBACK_COMMAND_QUEUE_SERVER_PORT,
  FALLBACK_MOCKSERVER_PORT,
} from './Constants';
import Utilities from './Utilities';
import { ACCOUNT_ACTIVITY_WS } from '../websocket/constants.ts';
// eslint-disable-next-line import-x/no-nodejs-modules
import { execSync } from 'child_process';
import type { CurrentDeviceDetails } from './fixture';

// eslint-disable-next-line @typescript-eslint/no-var-requires, import-x/no-commonjs, @typescript-eslint/no-require-imports
const deviceMatrix: DeviceMatrix = require('../performance/device-matrix.json');

type AndroidIntentExtra = ['s', string, string];

/**
 * Get the driver instance.
 * @returns The driver instance.
 */
export function getDriver(): WebdriverIO.Browser {
  const drv = globalThis.driver;
  if (!drv) throw new Error('driver is not available');
  return drv;
}

/**
 * Runs a callback with a temporarily increased implicit wait timeout.
 * Restores the default timeout afterward, even if the callback throws.
 * Use this for operations that legitimately need a longer wait (e.g. waitForDisplayed with 30s).
 * @param timeoutMs - The timeout in milliseconds.
 * @param fn - The callback to run.
 * @returns The result of the callback.
 */
export async function withImplicitWait<T>(
  timeoutMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const drv = getDriver();
  await drv.setTimeout({ implicit: timeoutMs });
  try {
    return await fn();
  } finally {
    await drv.setTimeout({ implicit: DEFAULT_IMPLICIT_WAIT_MS });
  }
}

/**
 * Run an async step with a timeout. Rejects after ms so callers can catch
 * and continue.
 * @param promise - The promise to run with a timeout
 * @param ms - The timeout in milliseconds
 * @param label - The label of the operation (default: 'operation')
 * @returns The result of the promise
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'operation',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

/**
 * boxedStep - Wraps a function in a Playwright step - Used for the Test Report
 * Used for the Test Report of the Appium framework.
 * @param target - The function to wrap
 * @param context - The context of the function
 * @returns - The wrapped function
 */
export function boxedStep<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext,
): (this: This, ...args: Args) => Return {
  const replacementMethod = function (this: This, ...args: Args): Return {
    const self = this as This & {
      name?: string; // For static methods, `this` is the class constructor which has a `name` property
      constructor: {
        name: string;
      };
      elem?: WebdriverIO.Element | { selector: string }; // WebdriverIO element with selector
    };
    const methodName = context.name as string;

    // For static methods, `this` is the class constructor itself, so use `this.name`
    // For instance methods, `this` is the instance, so use `this.constructor.name`
    const className = context.static ? self.name : self.constructor.name;
    let stepName = className + '.' + methodName;

    if (self.elem?.selector) {
      stepName += ` [${self.elem.selector}]`;
    }

    // Add args info for certain methods
    if (args.length > 0 && ['fill', 'type', 'setValue'].includes(methodName)) {
      const argPreview =
        String(args[0]).length > 50
          ? String(args[0]).substring(0, 50) + '...'
          : String(args[0]);
      stepName += ` ("${argPreview}")`;
    }

    return test.step(
      stepName,
      async () => {
        try {
          const result = await target.call(this, ...args);
          return result;
        } catch (error) {
          // Take screenshot on error for better debugging
          try {
            const driver = getDriver();
            const screenshot = await driver.takeScreenshot();
            await test.info().attach(`${methodName}-error-screenshot`, {
              body: Buffer.from(screenshot, 'base64'),
              contentType: 'image/png',
            });
          } catch (screenshotError) {
            // Don't fail if screenshot fails
            console.warn(
              'Failed to capture error screenshot:',
              screenshotError,
            );
          }
          throw error;
        }
      },
      { box: true },
    ) as Return;
  };

  return replacementMethod;
}

class PlaywrightUtilities {
  /**
   * Get the device screen size.
   * @returns The device screen size.
   */
  static async getDeviceScreenSize(): Promise<{
    width: number;
    height: number;
  }> {
    const screenSize = getWindowSize();
    return { width: screenSize.width, height: screenSize.height };
  }

  /**
   * Temporary wait method for the Playwright framework migration to keep the
   * 1:1 to the old Appwright implementation.
   * See: https://github.com/MetaMask/metamask-mobile/blob/dd3323cfabc55c2a3a44509c8b601cb9b218536c/tests/framework/utils/Flows.js#L228
   * @param ms - The time to wait in milliseconds
   * @returns A promise that resolves when the wait is complete
   */
  static async wait(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  static buildDeviceAccountMapping(): Record<string, string | null> {
    const mapping: Record<string, string | null> = {};

    // Process Android devices
    deviceMatrix.android_devices.forEach((device) => {
      if (device.category === 'high') {
        mapping[device.name] = 'Account 3';
      } else if (device.category === 'low') {
        // Low category Android devices use default Account 1
        mapping[device.name] = null;
      }
    });

    // Process iOS devices
    deviceMatrix.ios_devices.forEach((device) => {
      if (device.category === 'high') {
        mapping[device.name] = 'Account 4';
      } else if (device.category === 'low') {
        mapping[device.name] = 'Account 5';
      }
    });

    return mapping;
  }

  /**
   * Wait for element to be not visible and throw on failure
   * @param element - The element to wait for
   * @param timeout - The timeout in milliseconds
   */
  static async waitForElementToDisappear(
    element: PlaywrightElement,
    timeout = 5000,
  ): Promise<void> {
    await element.waitForDisplayed({ reverse: true, timeout });
  }

  static setupChromeDisableFre(): void {
    try {
      execSync(`adb shell am set-debug-app --persistent ${CHROME_PACKAGE}`, {
        stdio: 'pipe',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Could not set Chrome as debug app (FRE may show): ${message}`,
      );
    }

    try {
      execSync(
        `adb shell "echo 'chrome --disable-fre --no-default-browser-check --no-first-run' > /data/local/tmp/chrome-command-line"`,
        { stdio: 'pipe' },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Could not write Chrome command-line (FRE may show): ${message}`,
      );
    }
  }

  static clearChromeData(): void {
    try {
      execSync(`adb shell pm clear ${CHROME_PACKAGE}`, { stdio: 'pipe' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `Could not clear Chrome data (Chrome may open with existing tabs): ${message}`,
      );
    }
  }

  /**
   * Resolves {@link LaunchArgs} defaults for Playwright + Appium (same logical defaults as
   * `FixtureHelper` Detox Android: fallback ports + URL blacklist + account-activity WS fallback).
   * Callers may override or extend via `launchArgs` (e.g. real ports when `withFixtures` is active).
   */
  private static buildResolvedLaunchArgs(
    { launchArgs }: { launchArgs?: Partial<LaunchArgs> } = {
      launchArgs: {} as Partial<LaunchArgs>,
    },
  ): Record<string, string> {
    const e2eDefaults: Record<string, string> = {
      fixtureServerPort: `${FALLBACK_FIXTURE_SERVER_PORT}`,
      commandQueueServerPort: `${FALLBACK_COMMAND_QUEUE_SERVER_PORT}`,
      detoxURLBlacklistRegex: Utilities.BlacklistURLs,
      mockServerPort: `${FALLBACK_MOCKSERVER_PORT}`,
      [ACCOUNT_ACTIVITY_WS.launchArgKey]: `${ACCOUNT_ACTIVITY_WS.fallbackPort}`,
    };

    const resolved: Record<string, string> = { ...e2eDefaults };
    if (launchArgs) {
      for (const [key, value] of Object.entries(launchArgs)) {
        if (value !== undefined && value !== '') {
          resolved[key] = typeof value === 'boolean' ? String(value) : value;
        }
      }
    }
    return resolved;
  }

  /**
   * Builds Android string intent extras from {@link LaunchArgs}.
   * Each defined string value is passed as a string extra (`--es`) using the
   * same keys as Detox `launchArgs` / `react-native-launch-arguments`.
   */
  private static buildAndroidIntentExtras(
    { launchArgs }: { launchArgs?: Partial<LaunchArgs> } = {
      launchArgs: {} as Partial<LaunchArgs>,
    },
  ): AndroidIntentExtra[] {
    const resolved = PlaywrightUtilities.buildResolvedLaunchArgs({
      launchArgs,
    });

    const extras: AndroidIntentExtra[] = [];
    for (const [key, value] of Object.entries(resolved)) {
      if (value === undefined || value === '') {
        continue;
      }
      extras.push(['s', key, String(value)]);
    }

    return extras;
  }

  /**
   * Builds XCUITest process `arguments` for `mobile: launchApp`, consumed by
   * `react-native-launch-arguments` on iOS (must terminate the app before relaunch for args to apply).
   */
  private static buildIosLaunchProcessArguments(
    { launchArgs }: { launchArgs?: Partial<LaunchArgs> } = {
      launchArgs: {} as Partial<LaunchArgs>,
    },
  ): string[] {
    const resolved = PlaywrightUtilities.buildResolvedLaunchArgs({
      launchArgs,
    });
    const argumentsList: string[] = [];
    for (const [key, value] of Object.entries(resolved)) {
      if (value === undefined || value === '') {
        continue;
      }
      argumentsList.push(`-${key}`, String(value));
    }
    return argumentsList;
  }

  /**
   *
   * @param currentDeviceDetails - The current device details
   * @param { launchArgs } - The launch arguments
   * @returns A promise that resolves when the app is launched
   */
  private static async launchAppAndroid(
    currentDeviceDetails: CurrentDeviceDetails,
    { launchArgs }: { launchArgs?: Partial<LaunchArgs> } = {
      launchArgs: {} as Partial<LaunchArgs>,
    },
  ): Promise<void> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const pkg = currentDeviceDetails.packageName?.trim();
    const activity = currentDeviceDetails.launchableActivity?.trim();
    if (!pkg || !activity) {
      throw new Error(
        `Android launch requires non-empty packageName and launchableActivity on currentDeviceDetails (set tests/playwright.config.ts use.app.packageName and use.app.launchableActivity). Got packageName="${currentDeviceDetails.packageName}", launchableActivity="${currentDeviceDetails.launchableActivity}".`,
      );
    }

    const extras = PlaywrightUtilities.buildAndroidIntentExtras({
      launchArgs,
    });
    const stop = launchArgs?.stop ?? true;
    const wait = launchArgs?.wait ?? true;

    await drv.execute('mobile: startActivity', {
      component: `${pkg}/${activity}`,
      action: 'android.intent.action.MAIN',
      categories: ['android.intent.category.LAUNCHER'],
      stop,
      wait,
      ...(extras.length > 0 ? { extras } : {}),
    });
  }

  /**
   * Launches the iOS app under test with {@link LaunchArgs} via XCUITest `mobile: launchApp`.
   * Terminates first so process `arguments` are not ignored when the app was already running.
   *
   * @param currentDeviceDetails - The current device details
   * @param { launchArgs } - The launch arguments
   * @returns A promise that resolves when the app is launched
   */
  private static async launchAppIOS(
    currentDeviceDetails: CurrentDeviceDetails,
    { launchArgs }: { launchArgs?: Partial<LaunchArgs> } = {
      launchArgs: {} as Partial<LaunchArgs>,
    },
  ): Promise<void> {
    const bundleId = currentDeviceDetails.appId;
    if (!bundleId) {
      throw new Error('app id is not available for iOS launch');
    }

    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');

    const argumentsList = PlaywrightUtilities.buildIosLaunchProcessArguments({
      launchArgs,
    });

    await drv.terminateApp(bundleId);

    await drv.execute('mobile: launchApp', {
      bundleId,
      ...(argumentsList.length > 0 ? { arguments: argumentsList } : {}),
    });
  }

  /**
   * Launch an app
   * @param currentDeviceDetails - The current device details
   * @param { launchArgs } - The launch arguments
   * @returns A promise that resolves when the app is launched
   */
  static async launchApp(
    currentDeviceDetails: CurrentDeviceDetails,
    { launchArgs }: { launchArgs?: Partial<LaunchArgs> } = {
      launchArgs: {} as Partial<LaunchArgs>,
    },
  ): Promise<void> {
    if (!currentDeviceDetails?.packageName && !currentDeviceDetails?.appId) {
      throw new Error('Package name or app id is not available');
    }

    if (currentDeviceDetails.platform === 'android') {
      await this.launchAppAndroid(currentDeviceDetails, {
        launchArgs,
      });
    } else if (currentDeviceDetails.platform === 'ios') {
      await this.launchAppIOS(currentDeviceDetails, { launchArgs });
    } else {
      throw new Error('Unsupported platform');
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Change this once we use functions for the PlaywrightAdapter Utils
export default PlaywrightUtilities;
