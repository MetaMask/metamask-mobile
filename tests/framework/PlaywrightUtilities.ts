import test from '@playwright/test';
import type { DeviceMatrix } from './types';
import { PlaywrightElement } from './PlaywrightAdapter';
import {
  DEFAULT_IMPLICIT_WAIT_MS,
  DEFAULT_SNAPSHOT_MAX_DEPTH,
  DEFAULT_SNAPSHOT_MAX_CHILDREN,
  DEFAULT_CUSTOM_SNAPSHOT_TIMEOUT,
} from './Constants';

// eslint-disable-next-line @typescript-eslint/no-var-requires, import-x/no-commonjs, @typescript-eslint/no-require-imports
const deviceMatrix: DeviceMatrix = require('../performance/device-matrix.json');

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

export interface SnapshotSettings {
  snapshotMaxDepth?: number;
  snapshotMaxChildren?: number;
  customSnapshotTimeout?: number;
}

/**
 * Runs a callback with temporarily adjusted WDA snapshot settings.
 * Restores defaults afterward, even if the callback throws.
 * Use this for heavy screens (e.g. token selector lists) where
 * a smaller depth/children limit speeds up element lookups.
 */
export async function withSnapshotSettings<T>(
  settings: SnapshotSettings,
  fn: () => Promise<T>,
): Promise<T> {
  const drv = getDriver();
  await drv.updateSettings(settings);
  try {
    return await fn();
  } finally {
    await drv.updateSettings({
      snapshotMaxDepth: DEFAULT_SNAPSHOT_MAX_DEPTH,
      snapshotMaxChildren: DEFAULT_SNAPSHOT_MAX_CHILDREN,
      customSnapshotTimeout: DEFAULT_CUSTOM_SNAPSHOT_TIMEOUT,
    });
  }
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
    const screenSize = await getDriver().getWindowSize();
    return { width: screenSize.width, height: screenSize.height };
  }

  /**
   * Temporary wait method for the Playwright framework migration to keep the
   * 1:1 to the old Appwright implementation.
   * See: https://github.com/MetaMask/metamask-mobile/blob/main/tests/framework/utils/Flows.js#L228
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
}

// Change this once we use functions for the PlaywrightAdapter Utils
export default PlaywrightUtilities;
