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
   * Wait for element to be enabled with retry mechanism
   */
  static async waitForElementToBeEnabled(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    timeout = 3500,
    interval = 100,
  ): Promise<void> {
    return this.executeWithRetry(
      async () => {
        const el = await elementPromise;
        const attributes = await el.getAttributes();
        if (!('enabled' in attributes) || !attributes.enabled) {
          throw new Error('Element is not enabled');
        }
      },
      {
        timeout,
        interval,
        description: 'Element to be enabled',
      },
    );
  }

  /**
   * Waits for an element to become stable (not moving) by checking its position multiple times.
   */
  static async waitForElementToStopMoving(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    options: StabilityOptions = {},
  ): Promise<void> {
    const { timeout = 5000, interval = 200, stableCount = 3 } = options;

    return this.executeWithRetry(
      async () => {
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
          const el = await elementPromise;
          const position = await getPosition(el);

          if (!position) {
            await new Promise((resolve) =>
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

          await new Promise((resolve) => setTimeout(resolve, interval));
        }

        throw new Error('Element did not become stable in time');
      },
      {
        timeout,
        description: 'Element stability',
      },
    );
  }

  /**
   * Wait for element to be in a ready state (visible, enabled, stable)
   */
  static async waitForReadyState(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    options: {
      timeout?: number;
      skipStabilityCheck?: boolean;
      skipVisibilityCheck?: boolean;
    } = {},
  ): Promise<Detox.IndexableNativeElement> {
    const {
      timeout = TEST_CONFIG_DEFAULTS.timeout,
      skipStabilityCheck = false,
      skipVisibilityCheck = false,
    } = options;

    return this.executeWithRetry(
      async () => {
        const el = await elementPromise;

        if (!skipVisibilityCheck) {
          if (device.getPlatform() === 'ios') {
            await waitFor(el).toExist().withTimeout(2000);
          } else {
            await waitFor(el).toBeVisible().withTimeout(2000);
          }
        }

        await Utilities.waitForElementToBeEnabled(Promise.resolve(el), 2000);

        if (!skipStabilityCheck) {
          await this.waitForElementToStopMoving(Promise.resolve(el), {
            timeout: 2000,
          });
        }

        return el;
      },
      {
        timeout,
        description: 'Element ready state check',
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
      condition = null,
      maxRetries = Math.floor(timeout / interval),
      elemDescription = 'unspecified element',
      description,
    } = options;

    let lastError: Error | undefined;
    let attempt = 0;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout && attempt < maxRetries) {
      try {
        if (condition && !(await condition())) {
          throw new Error(`Condition not set for ${description}`);
        }

        const result = await operation();

        if (attempt > 0) {
          // we should only hit this if the operation did not throw an error
          // eslint-disable-next-line no-console
          console.log(
            `✅ ${description} succeeded after ${attempt} retries for ${elemDescription}`,
          );
        }

        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (
          Date.now() - startTime + interval >= timeout ||
          attempt >= maxRetries
        ) {
          break;
        }

        // eslint-disable-next-line no-console
        console.log(
          `⚠️  ${description} failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(
            interval,
          )}ms... for ${elemDescription}`,
        );
        // eslint-disable-next-line no-console
        console.log(`Error: ${(error as Error).message}`);

        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }
    // Only throw if we've exhausted all retries
    if (attempt >= maxRetries || Date.now() - startTime >= timeout) {
      const errorMessage = [
      `❌ ${description} failed after ${attempt} attempts over ${
        Date.now() - startTime
      }ms for ${elemDescription}`,
      `Last error: ${lastError?.message || 'Unknown error'}`,
      ].join('\n');

      throw new Error(errorMessage);
    }

    // This should never be reached, but TypeScript requires a return statement
    throw new Error(`Unexpected end of retry loop for ${description}`);
  }
}

export { TEST_CONFIG_DEFAULTS as BASE_DEFAULTS };
