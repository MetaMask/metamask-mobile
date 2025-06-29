/* eslint-disable no-console */
import { blacklistURLs } from '../resources/blacklistURLs.json';
import { RetryOptions, StabilityOptions } from './types';

const TEST_CONFIG_DEFAULTS = {
  timeout: 15000,
  retryInterval: 500,
  actionDelay: 100,
  stabilityCheckInterval: 200,
  stabilityCheckCount: 3,
};

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
    elementPromise: DetoxElement,
  ): Promise<void> {
    const el = (await elementPromise) as Detox.IndexableNativeElement;
    const attributes = await el.getAttributes();
    if (!('enabled' in attributes) || !attributes.enabled) {
      throw new Error('Element is not enabled');
    }
  }

  /**
   * Wait for element to be enabled with retry mechanism
   */
  static async waitForElementToBeEnabled(
    elementPromise: DetoxElement,
    timeout = 3500,
    interval = 100,
  ): Promise<void> {
    return this.executeWithRetry(
      () => this.checkElementEnabled(elementPromise),
      {
        timeout,
        interval,
        description: 'Element to be enabled',
      },
    );
  }

  /**
   * Check if element is stable (non-retry version)
   */
  static async checkElementStable(
    elementPromise: DetoxElement,
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
      const el = (await elementPromise) as Detox.IndexableNativeElement;
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

    throw new Error('Element did not become stable in time');
  }

  /**
   * Waits for an element to become stable (not moving) by checking its position multiple times.
   */
  static async waitForElementToStopMoving(
    elementPromise: DetoxElement,
    options: StabilityOptions = {},
  ): Promise<void> {
    const { timeout = 5000 } = options;
    return this.executeWithRetry(
      () => this.checkElementStable(elementPromise, options),
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
    elementPromise: DetoxElement,
    options: {
      timeout?: number;
      checkStability?: boolean;
      skipVisibilityCheck?: boolean;
    } = {},
  ): DetoxElement{
    const {
      timeout,
      checkStability = false,
      skipVisibilityCheck = false,
    } = options;

    const el = (await elementPromise) as Detox.IndexableNativeElement;
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
     * - Stability check: 2000ms (allows time for UI to settle)
     */

    if (!skipVisibilityCheck) {
      const visibilityTimeout = timeout || 100; // If no timeout is provided, default to 100ms
      if (device.getPlatform() === 'ios') {
        await waitFor(el).toExist().withTimeout(visibilityTimeout);
      } else {
        await waitFor(el).toBeVisible().withTimeout(visibilityTimeout);
      }

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
    elementPromise: DetoxElement,
    options: {
      timeout?: number;
      checkStability?: boolean;
      skipVisibilityCheck?: boolean;
      elemDescription?: string;
    } = {},
  ): DetoxElement {
    const { timeout = TEST_CONFIG_DEFAULTS.timeout, elemDescription } = options;

    return this.executeWithRetry(
      () => this.checkElementReadyState(elementPromise, options),
      {
        timeout,
        description: 'Element ready state check',
        elemDescription,
      },
    );
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

    while (true) {
      try {
        const result = await operation();

        const actionMessage = `✅ ${description} succeeded after ${attempt} ${
          attempt === 1 ? 'retry' : 'retries'
        }`;
        const elemMessage = elemDescription ? ` for ${elemDescription}` : '';

        if (attempt > 0) {
          console.log(`${actionMessage}${elemMessage}.`);
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
          const actionMessage = `⚠️  ${description} failed (attempt ${attempt})`;
          const elemMessage = elemDescription ? ` for ${elemDescription}` : '';
          console.log(
            `${actionMessage}${elemMessage}. Retrying... (timeout: ${timeout}ms)`,
          );
          console.log(`Error: ${lastError.message}`);
        }

        // eslint-disable-next-line no-restricted-syntax
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    const elapsedTime = Date.now() - startTime;

    const errorMessage = [
      `❌ ${description} failed after ${attempt} attempt(s) over ${elapsedTime}ms`,
      `${elemDescription ? ` for ${elemDescription}` : ''}`,
      `Last error: ${lastError?.message || 'Unknown error'}`,
    ].join('\n');

    throw new Error(errorMessage);
  }
}

export { TEST_CONFIG_DEFAULTS as BASE_DEFAULTS };
