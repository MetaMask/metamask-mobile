import { BASE_DEFAULTS, sleep } from './Utilities.ts';
import { AssertionOptions } from './types.ts';
import type { PlaywrightElement } from './PlaywrightAdapter.ts';
import PlaywrightMatchers from './PlaywrightMatchers.ts';

export interface VisibilityWithSettleOptions extends AssertionOptions {
  settleMs?: number;
}

export default class PlaywrightAssertions {
  private static getTimeout(options: AssertionOptions): number {
    return options.timeout ?? BASE_DEFAULTS.timeout;
  }

  static async expectElementToBeVisible(
    targetElement: PlaywrightElement | Promise<PlaywrightElement>,
    options: AssertionOptions = {},
  ): Promise<void> {
    const el = await targetElement;
    await el.waitForDisplayed({ timeout: this.getTimeout(options) });
  }

  static async expectElementToBeVisibleWithSettle(
    targetElement: PlaywrightElement | Promise<PlaywrightElement>,
    options: VisibilityWithSettleOptions = {},
  ): Promise<void> {
    const { settleMs = 0, ...assertionOptions } = options;

    await this.expectElementToBeVisible(targetElement, assertionOptions);

    if (settleMs > 0) {
      await sleep(settleMs);
    }
  }

  static async expectElementToNotBeVisible(
    targetElement: PlaywrightElement | Promise<PlaywrightElement>,
    options: AssertionOptions = {},
  ): Promise<void> {
    const el = await targetElement;
    await el.waitForDisplayed({
      reverse: true,
      timeout: this.getTimeout(options),
    });
  }

  static async expectTextDisplayed(
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const el = await PlaywrightMatchers.getElementByText(text);
    await el.waitForDisplayed({ timeout: this.getTimeout(options) });
  }

  static async expectTextNotDisplayed(
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const el = await PlaywrightMatchers.getElementByText(text);
    await el.waitForDisplayed({
      reverse: true,
      timeout: this.getTimeout(options),
    });
  }

  /**
   * Waits for a condition to be met within a given timeout period.
   * @param condition - The condition to wait for.
   * @param options - The options for the assertion.
   * @param options.maxRetries - The maximum number of retries.
   * @param options.interval - The interval between retries.
   * @param options.description - The description of the assertion.
   * @param options.elemDescription - The description of the element.
   * @param options.timeout - The timeout for the assertion.
   */
  static async expectConditionWithRetry(
    condition: () => Promise<void>,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { maxRetries = 5, interval = 1000 } = options;
    let lastError: unknown;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await condition();
        return;
      } catch (error) {
        lastError = error;
        console.log(
          `PlaywrightAssertions: condition not met on attempt ${i + 1}`,
        );
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }
    throw lastError;
  }
}
