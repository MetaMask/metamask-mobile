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
}
