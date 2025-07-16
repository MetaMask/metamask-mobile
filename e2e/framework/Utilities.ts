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
    detoxElement: DetoxElement,
  ): Promise<void> {
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

  /**
   * Wait for element to be enabled with retry mechanism
   */
  static async waitForElementToBeEnabled(
    detoxElement: DetoxElement,
    timeout = 3500,
    interval = 100,
  ): Promise<void> {
    return this.executeWithRetry(
      () => this.checkElementEnabled(detoxElement),
      {
        timeout,
        interval,
        description: 'Element to be enabled',
      },
    );
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
        throw new Error('🚫 Element does not have valid frame bounds - may be obscured');
      }

      // Additional Android-specific checks could be added here
      // For now, we rely on the basic frame check and visibility
      try {
        // Try to get element center point to ensure it's accessible
        const centerX = attributes.frame.x + attributes.frame.width / 2;
        const centerY = attributes.frame.y + attributes.frame.height / 2;

        if (centerX <= 0 || centerY <= 0) {
          throw new Error('🚫 Element center point is not accessible - may be obscured');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`🚫 Element appears to be obscured or not tappable: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('window focus') || errorMessage.includes('window-focus') || errorMessage.includes('has-window-focus=false')) {
        console.warn('⚠️ Skipping obscuration check - window has no focus (common in CI environments)');
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
      (typeof webEl?.runScript === 'function') ||
      (webEl?.constructor?.name && (
        webEl.constructor.name.includes('IndexableWebElement') ||
        webEl.constructor.name.includes('SecuredWebElementFacade') ||
        webEl.constructor.name.includes('WebElement')
      ))
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

          console.log(successMessage);
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

          console.log(retryMessage);
          console.log(`🔍 Error: ${lastError.message}`);
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
