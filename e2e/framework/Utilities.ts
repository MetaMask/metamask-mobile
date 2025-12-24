import { waitFor } from 'detox';
import { blacklistURLs } from '../resources/blacklistURLs.json';
import { RetryOptions, StabilityOptions } from './types';
import { createLogger } from './logger';
import test from '@playwright/test';
// eslint-disable-next-line import/no-nodejs-modules
import { setTimeout as asyncSetTimeout } from 'node:timers/promises';

const TEST_CONFIG_DEFAULTS = {
  timeout: 15000,
  retryInterval: 500,
  actionDelay: 100,
  stabilityCheckInterval: 200,
  stabilityCheckCount: 3,
};

const logger = createLogger({ name: 'Utilities' });

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

/**
 * Enhanced Utilities class with retry mechanisms and stability checking
 */
export default class Utilities {
  /**
   * Formats an array of strings into a regex pattern string for exact matching.
   */
  static formatForExactMatchGroup(regexstrings: string[]): string {
    return `\\("${regexstrings.join('","')}"\\)`;
  }

  /**
   * A getter method that returns a formatted string of blacklisted URLs for exact matching in a regex pattern.
   */
  static get BlacklistURLs(): string {
    return this.formatForExactMatchGroup(blacklistURLs);
  }

  /**
   * Check if element is enabled (non-retry version)
   */
  static async checkElementEnabled(detoxElement: DetoxElement): Promise<void> {
    const el = (await detoxElement) as Detox.IndexableNativeElement;
    const attributes = await el.getAttributes();
    if (!('enabled' in attributes) || !attributes.enabled) {
      throw new Error(
        [
          '🚫 Element is not enabled.',
          '',
          '💡 If this element might be disabled in some situations,',
          '   consider using the {checkEnabled: false} option.',
          '',
          '📝 Example:',
          '   await Gestures.waitAndTap(element, {checkEnabled: false})',
        ].join('\n'),
      );
    }
  }

  static async checkElementDisabled(detoxElement: DetoxElement): Promise<void> {
    const el = (await detoxElement) as Detox.IndexableNativeElement;
    const attributes = await el.getAttributes();
    if (!('enabled' in attributes) || attributes.enabled) {
      throw new Error('🚫 Element is enabled, but should be disabled.');
    }
  }

  /**
   * Wait for element to be enabled with retry mechanism
   */
  static async waitForElementToBeEnabled(
    detoxElement: DetoxElement,
    timeout = 3500,
    interval = 100,
  ): Promise<void> {
    return this.executeWithRetry(() => this.checkElementEnabled(detoxElement), {
      timeout,
      interval,
      description: 'Element to be enabled',
    });
  }

  /**
   * Check if element is actually tappable (not obscured by other elements)
   * Android-specific check for element obscuration
   */
  static async checkElementNotObscured(
    detoxElement: DetoxElement,
  ): Promise<void> {
    try {
      const el = (await detoxElement) as Detox.IndexableNativeElement;
      const attributes = await el.getAttributes();

      // Check if element has proper frame/bounds
      if (!('frame' in attributes) || !attributes.frame) {
        throw new Error(
          '🚫 Element does not have valid frame bounds - may be obscured',
        );
      }

      // Additional Android-specific checks could be added here
      // For now, we rely on the basic frame check and visibility
      try {
        // Try to get element center point to ensure it's accessible
        const centerX = attributes.frame.x + attributes.frame.width / 2;
        const centerY = attributes.frame.y + attributes.frame.height / 2;

        if (centerX <= 0 || centerY <= 0) {
          throw new Error(
            '🚫 Element center point is not accessible - may be obscured',
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(
          `🚫 Element appears to be obscured or not tappable: ${errorMessage}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('window focus') ||
        errorMessage.includes('window-focus') ||
        errorMessage.includes('has-window-focus=false')
      ) {
        logger.warn(
          '⚠️ Skipping obscuration check - window has no focus (common in CI environments)',
        );
        return;
      }
      throw error;
    }
  }

  /**
   * Check if element is stable (non-retry version)
   */
  static async checkElementStable(
    detoxElement: DetoxElement,
    options: StabilityOptions = {},
  ): Promise<void> {
    const { timeout = 2000, interval = 200, stableCount = 3 } = options;
    let lastPosition: { x: number; y: number } | null = null;
    let stableChecks = 0;
    const fallBackTimeout = 2000;
    const start = Date.now();

    const getPosition = async (el: Detox.IndexableNativeElement) => {
      try {
        const attributes = await el.getAttributes();
        if (
          'frame' in attributes &&
          attributes.frame &&
          typeof attributes.frame.x === 'number' &&
          typeof attributes.frame.y === 'number'
        ) {
          return { x: attributes.frame.x, y: attributes.frame.y };
        }
        return null;
      } catch {
        return null;
      }
    };

    while (Date.now() - start < timeout) {
      const el = (await detoxElement) as Detox.IndexableNativeElement;
      const position = await getPosition(el);

      if (!position) {
        await new Promise((resolve) =>
          // eslint-disable-next-line no-restricted-syntax
          setTimeout(resolve, fallBackTimeout),
        );
        return; // Return early if position is not available
      }

      if (
        lastPosition &&
        position.x === lastPosition.x &&
        position.y === lastPosition.y
      ) {
        stableChecks += 1;
        if (stableChecks >= stableCount) return;
      } else {
        lastPosition = position;
        stableChecks = 1;
      }

      // eslint-disable-next-line no-restricted-syntax
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('⏱️ Element did not become stable in time');
  }

  /**
   * Waits for an element to become stable (not moving) by checking its position multiple times.
   */
  static async waitForElementToStopMoving(
    detoxElement: DetoxElement,
    options: StabilityOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;
    return this.executeWithRetry(
      () => this.checkElementStable(detoxElement, options),
      {
        timeout,
        description: 'Element stability',
      },
    );
  }

  /**
   * Check element ready state (non-retry version)
   */
  static async checkElementReadyState(
    detoxElement: DetoxElement,
    options: {
      timeout?: number;
      checkStability?: boolean;
      checkVisibility?: boolean;
      checkEnabled?: boolean;
    } = {},
  ): DetoxElement {
    const {
      timeout,
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
    } = options;

    const el = (await detoxElement) as Detox.IndexableNativeElement;
    /**
     * IMPORTANT: Default timeout behavior
     *
     * When no timeout is provided, we use fallback defaults to ensure compatibility
     * with the retry mechanism in executeWithRetry(). This method can be used in two ways:
     *
     * 1. Direct usage: Always provide explicit timeout values for predictable behavior
     * 2. Via executeWithRetry(): Timeout defaults are handled automatically
     *
     * Default fallbacks:
     * - Visibility check: 100ms (minimal check)
     * - Enabled check: No timeout (immediate check)
     * - Stability check: 2000ms (allows time for UI to settle)
     */

    if (checkVisibility) {
      const visibilityTimeout = timeout || 100; // If no timeout is provided, default to 100ms
      if (device.getPlatform() === 'ios') {
        await waitFor(el).toExist().withTimeout(visibilityTimeout);
      } else {
        await waitFor(el).toBeVisible().withTimeout(visibilityTimeout);
        await this.checkElementNotObscured(Promise.resolve(el)); // Ensure element is not obscured
      }
    }

    if (checkEnabled && device.getPlatform() === 'android') {
      // checkEnabled is only relevant for Android
      // iOS elements often fail on enabled checks even when they are tappable
      await this.checkElementEnabled(Promise.resolve(el));
    }

    if (checkStability) {
      const stabilityTimeout = timeout || 2000; // If no timeout is provided, default to 2000ms
      const stabilityCheckInterval = timeout ? timeout / 10 : 200; // Default to 200ms if no timeout is provided
      await this.checkElementStable(Promise.resolve(el), {
        timeout: stabilityTimeout,
        interval: stabilityCheckInterval,
      });
    }

    return el;
  }

  /**
   * Wait for element to be in a ready state (visible, enabled, stable)
   */
  static async waitForReadyState(
    detoxElement: DetoxElement,
    options: {
      timeout?: number;
      checkStability?: boolean;
      skipVisibilityCheck?: boolean;
      elemDescription?: string;
    } = {},
  ): DetoxElement {
    const { timeout = TEST_CONFIG_DEFAULTS.timeout, elemDescription } = options;

    return this.executeWithRetry(
      () => this.checkElementReadyState(detoxElement, options),
      {
        timeout,
        description: 'Element ready state check',
        elemDescription,
      },
    );
  }

  /**
   * Wait for element to be visible and throw on failure
   */
  static async waitForElementToBeVisible(
    detoxElement: DetoxElement | DetoxMatcher,
    timeout: number = 2000,
  ): Promise<void> {
    const el = (await detoxElement) as Detox.IndexableNativeElement;
    const isWebElement = this.isWebElement(el);

    if (isWebElement) {
      // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
      await (expect(el) as any).toExist();
    } else if (device.getPlatform() === 'ios') {
      await waitFor(el).toExist().withTimeout(timeout);
    } else {
      await waitFor(el).toBeVisible().withTimeout(timeout);
    }
  }

  /**
   * Wait for element to be not visible and throw on failure
   */
  static async waitForElementToDisappear(
    detoxElement: DetoxElement | DetoxMatcher,
    timeout: number = 2000,
  ): Promise<void> {
    const el = (await detoxElement) as Detox.IndexableNativeElement;
    const isWebElement = this.isWebElement(el);
    if (isWebElement) {
      // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
      await (expect(el) as any).not.toExist();
    } else if (device.getPlatform() === 'ios') {
      await waitFor(el).not.toExist().withTimeout(timeout);
    } else {
      await waitFor(el).not.toBeVisible().withTimeout(timeout);
    }
  }

  /**
   * Check if element is currently visible
   * Returns true if element is visible, false if not visible or doesn't exist
   */
  static async isElementVisible(
    detoxElement: DetoxElement | DetoxMatcher,
    timeout: number = 2000,
  ): Promise<boolean> {
    try {
      await this.waitForElementToBeVisible(detoxElement, timeout);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if an element is a WebElement
   */
  static isWebElement(el: unknown): boolean {
    if (!el || typeof el !== 'object') {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webEl = el as any;
    return !!(
      webEl?.webViewElement ||
      typeof webEl?.runScript === 'function' ||
      (webEl?.constructor?.name &&
        (webEl.constructor.name.includes('IndexableWebElement') ||
          webEl.constructor.name.includes('SecuredWebElementFacade') ||
          webEl.constructor.name.includes('WebElement')))
    );
  }

  /**
   * Waits for a condition to be met within a given timeout period.
   *
   * Note: Copied directly from the extension implementation
   *
   * @param {() => Promise<boolean>} condition - The condition to wait for. This function must return a boolean indicating whether the condition is met.
   * @param {object} options - Options for the wait.
   * @param {number} options.timeout - The maximum amount of time (in milliseconds) to wait for the condition to be met.
   * @param {number} options.interval - The interval (in milliseconds) between checks for the condition.
   * @returns {Promise<void>} A promise that resolves when the condition is met or the timeout is reached.
   * @throws {Error} Throws an error if the condition is not met within the timeout period.
   */
  static async waitUntil(
    condition: () => Promise<boolean>,
    { interval, timeout }: { interval: number; timeout: number },
  ): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + timeout;

    // Loop indefinitely until condition met or timeout
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = await condition();
      if (result === true) {
        return; // Condition met
      }

      const currentTime = Date.now();
      if (currentTime >= endTime) {
        throw new Error(`Condition not met within ${timeout}ms.`);
      }

      // Calculate remaining time to ensure we don't overshoot the timeout
      const remainingTime = endTime - currentTime;
      const waitTime = Math.min(interval, remainingTime);

      // always yield to the event loop, even for an interval of `0`, to avoid a
      // macro-task deadlock
      await asyncSetTimeout(waitTime, null, { ref: false });
    }
  }

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions,
  ): Promise<T> {
    const {
      timeout = TEST_CONFIG_DEFAULTS.timeout,
      interval = TEST_CONFIG_DEFAULTS.retryInterval,
      maxRetries = Math.floor(timeout / interval),
      elemDescription = '',
      description,
    } = options;

    let lastError: Error | undefined;
    let attempt = 0;
    const startTime = Date.now();

    const action = description || operation.name;

    while (true) {
      try {
        const result = await operation();

        if (attempt > 0) {
          const successMessage = [
            `✅ ${action} succeeded after ${attempt}`,
            ` ${attempt === 1 ? 'retry' : 'retries'}`,
            elemDescription ? ` for ${elemDescription}` : '',
            '.',
          ].join('');

          logger.debug(successMessage);
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        const elapsedTime = Date.now() - startTime;
        const timeoutExceeded = elapsedTime >= timeout;
        const maxRetriesReached = attempt >= maxRetries;

        if (timeoutExceeded || maxRetriesReached) {
          break;
        }

        if (attempt === 1) {
          const retryMessage = [
            `⚠️  ${action} failed (attempt ${attempt})`,
            ` on element`,
            elemDescription ? `: ${elemDescription}` : '',
            `. Retrying... (timeout: ${timeout}ms)`,
          ].join('');

          logger.debug(retryMessage);
          logger.debug(`🔍 Error: ${lastError.message}`);
        }

        // eslint-disable-next-line no-restricted-syntax
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    const elapsedTime = Date.now() - startTime;

    const errorMessage = [
      `❌ ${action} failed after ${attempt} attempt(s) over ${elapsedTime}ms`,
      `📍 Element Description: ${
        elemDescription || 'Description not provided'
      }`,
      `🔍 Last error: ${lastError?.message || 'Unknown error'}`,
    ].join('\n');

    const enhancedError = new Error(errorMessage);
    if (lastError?.stack) {
      enhancedError.stack = `${errorMessage}\n\nOriginal error stack:\n${lastError.stack}`;
    }
    throw enhancedError;
  }
}

export { TEST_CONFIG_DEFAULTS as BASE_DEFAULTS };
