import { blacklistURLs } from '../resources/blacklistURLs.json';
import { RetryOptions, StabilityOptions } from './types.ts';
import type { AppiumElement } from './AppiumElement.ts';
import AppiumAssertions from './AppiumAssertions.ts';
import AppiumGestures from './AppiumGestures.ts';
import { PlatformDetector } from './PlatformLocator.ts';
import { createLogger } from './logger.ts';
import { resolveE2EWaitTimeoutMs } from './Constants.ts';
// eslint-disable-next-line import-x/no-nodejs-modules
import { setTimeout as asyncSetTimeout } from 'node:timers/promises';
import { Json } from '@metamask/utils';

const TEST_CONFIG_DEFAULTS = {
  timeout: resolveE2EWaitTimeoutMs(15000),
  retryInterval: 500,
  actionDelay: 100,
  stabilityCheckInterval: 200,
  stabilityCheckCount: 3,
};

const logger = createLogger({ name: 'Utilities' });

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function stripJsonKeys(value: Json, excludedKeys: string[]): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value;
  }

  const next = { ...(value as Record<string, Json>) };
  for (const key of excludedKeys) {
    delete next[key];
  }
  return next;
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
  static async checkElementEnabled(
    elem: Promise<AppiumElement>,
  ): Promise<void> {
    const el = await elem;
    if (!(await el.isEnabled())) {
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
    return;
  }

  static async checkElementDisabled(
    elem: Promise<AppiumElement>,
  ): Promise<void> {
    const el = await elem;
    if (!(await el.isEnabled())) {
      return;
    }
    // RN may report isEnabled=true while native enabled="false".
    const enabledAttr = await el.getAttribute('enabled');
    if (enabledAttr === 'false') {
      return;
    }
    throw new Error('🚫 Element is enabled, but should be disabled.');
  }

  /**
   * Wait for element to be enabled with retry mechanism
   */
  static async waitForElementToBeEnabled(
    elem: Promise<AppiumElement>,
    timeout = 3500,
    interval = 100,
  ): Promise<void> {
    return this.executeWithRetry(() => this.checkElementEnabled(elem), {
      timeout,
      interval,
      description: 'Element to be enabled',
    });
  }

  /**
   * Wait for element to be disabled with retry mechanism
   */
  static async waitForElementToBeDisabled(
    elem: Promise<AppiumElement>,
    timeout = 3500,
    interval = 100,
  ): Promise<void> {
    return this.executeWithRetry(() => this.checkElementDisabled(elem), {
      timeout,
      interval,
      description: 'Element to be disabled',
    });
  }

  /**
   * Read text content from an element.
   */
  static async getElementText(elem: Promise<AppiumElement>): Promise<string> {
    const appiumElement = await elem;
    return appiumElement.textContent();
  }

  /**
   * Check if element is actually tappable (not obscured by other elements)
   * Android-specific check for element obscuration
   */
  static async checkElementNotObscured(
    elem: Promise<AppiumElement>,
  ): Promise<void> {
    try {
      const el = await elem;
      const raw = el.unwrap();
      const location = await raw.getLocation();
      const size = await raw.getSize();

      if (
        typeof location.x !== 'number' ||
        typeof location.y !== 'number' ||
        typeof size.width !== 'number' ||
        typeof size.height !== 'number'
      ) {
        throw new Error(
          '🚫 Element does not have valid frame bounds - may be obscured',
        );
      }

      const centerX = location.x + size.width / 2;
      const centerY = location.y + size.height / 2;

      if (centerX <= 0 || centerY <= 0) {
        throw new Error(
          '🚫 Element center point is not accessible - may be obscured',
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
    elem: Promise<AppiumElement>,
    options: StabilityOptions = {},
  ): Promise<void> {
    const { timeout = 2000, interval = 200, stableCount = 3 } = options;
    let lastPosition: { x: number; y: number } | null = null;
    let stableChecks = 0;
    const fallBackTimeout = 2000;
    const start = Date.now();

    const getPosition = async () => {
      try {
        const el = await elem;
        const location = await el.unwrap().getLocation();
        if (typeof location.x === 'number' && typeof location.y === 'number') {
          return { x: location.x, y: location.y };
        }
        return null;
      } catch {
        return null;
      }
    };

    while (Date.now() - start < timeout) {
      const position = await getPosition();

      if (!position) {
        await new Promise((resolve) =>
          // eslint-disable-next-line no-restricted-syntax
          setTimeout(resolve, fallBackTimeout),
        );
        return;
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
    elem: Promise<AppiumElement>,
    options: StabilityOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;
    return this.executeWithRetry(() => this.checkElementStable(elem, options), {
      timeout,
      description: 'Element stability',
    });
  }

  /**
   * Check element ready state (non-retry version)
   */
  static async checkElementReadyState(
    elem: Promise<AppiumElement>,
    options: {
      timeout?: number;
      checkStability?: boolean;
      checkVisibility?: boolean;
      checkEnabled?: boolean;
    } = {},
  ): Promise<AppiumElement> {
    const {
      timeout,
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
    } = options;

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

    const playwrightElem = elem;

    if (checkVisibility) {
      const visibilityTimeout = timeout || 100;
      await AppiumAssertions.expectElementToBeVisible(playwrightElem, {
        timeout: visibilityTimeout,
      });
    }

    if (checkEnabled && PlatformDetector.isAndroid()) {
      const pwEl = await playwrightElem;
      if (!(await pwEl.isEnabled())) {
        throw new Error('Element is not enabled');
      }
    }

    if (checkStability) {
      const stabilityTimeout = timeout || 2000;
      const stabilityCheckInterval = timeout ? timeout / 10 : 200;
      await AppiumGestures.waitForElementStable(await playwrightElem, {
        timeout: stabilityTimeout,
        interval: stabilityCheckInterval,
      });
    }

    return playwrightElem;
  }

  /**
   * Wait for element to be in a ready state (visible, enabled, stable)
   */
  static async waitForReadyState(
    elem: Promise<AppiumElement>,
    options: {
      timeout?: number;
      checkStability?: boolean;
      skipVisibilityCheck?: boolean;
      elemDescription?: string;
    } = {},
  ): Promise<AppiumElement> {
    const { timeout = TEST_CONFIG_DEFAULTS.timeout, elemDescription } = options;

    return this.executeWithRetry(
      () => this.checkElementReadyState(elem, options),
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
    elem: Promise<AppiumElement>,
    timeout: number = 2000,
  ): Promise<void> {
    await AppiumAssertions.expectElementToBeVisible(elem, { timeout });
    return;
  }

  /**
   * Wait for element to be not visible and throw on failure
   */
  static async waitForElementToDisappear(
    elem: Promise<AppiumElement>,
    timeout: number = 2000,
  ): Promise<void> {
    await AppiumAssertions.expectElementToNotBeVisible(elem, { timeout });
    return;
  }

  /**
   * Check if element is currently visible
   * Returns true if element is visible, false if not visible or doesn't exist
   */
  static async isElementVisible(
    elem: Promise<AppiumElement>,
    timeout: number = 2000,
  ): Promise<boolean> {
    try {
      await this.waitForElementToBeVisible(elem, timeout);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if an element is a Playwright/WebdriverIO web element facade.
   */
  static isWebElement(el: unknown): boolean {
    if (!el || typeof el !== 'object') {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webEl = el as any;
    return !!(
      typeof webEl?.scrollToView === 'function' ||
      typeof webEl?.fill === 'function' ||
      typeof webEl?.unwrap === 'function'
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
