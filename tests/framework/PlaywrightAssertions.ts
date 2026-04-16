import { BASE_DEFAULTS, sleep } from './Utilities.ts';
import { AssertionOptions } from './types.ts';
import type { PlaywrightElement } from './PlaywrightAdapter.ts';
import PlaywrightMatchers from './PlaywrightMatchers.ts';
import { addOverhead } from './PlaywrightUtilities.ts';

export interface VisibilityWithSettleOptions extends AssertionOptions {
  settleMs?: number;
}

/**
 * Assertion helpers that integrate with TimerHelper's automatic overhead
 * tracking so performance measurements reflect real app latency.
 *
 * ## How overhead compensation works
 *
 * Every Appium WebDriver command (findElement, isExisting, etc.) carries a
 * round-trip cost that on BrowserStack can be 3-18 s per call.  When a
 * `measure()` block wraps an assertion the raw wall-clock duration would be
 * dominated by that infrastructure latency, not by the app.
 *
 * To compensate we track two kinds of overhead:
 *
 * 1. **Element resolution** — the initial `$('~id')` HTTP call that locates
 * the element selector. Tracked in `expectElementToBeVisible`.
 *
 * 2. **Overhead probe** — after the element is confirmed visible we
 * immediately call `isExisting()` once more. Because the element is
 * already on-screen the entire call duration is pure Appium/network
 * overhead. This is the best single-call estimate we can get.
 *
 * `addOverhead()` is a no-op when no `measure()` is active, so these calls
 * are zero-cost for tests that don't use TimerHelper.
 */
export default class PlaywrightAssertions {
  private static getTimeout(options: AssertionOptions): number {
    return options.timeout ?? BASE_DEFAULTS.timeout;
  }

  /**
   * Polls for element existence using a single WebDriver command per attempt
   * (`isExisting`).  This avoids the multiple internal HTTP round-trips that
   * WebdriverIO's `waitForDisplayed` performs on each iteration.
   *
   * Overhead tracking logic:
   * - If the **first** `isExisting()` already returns `true`, the element
   * was visible before or during the network round-trip. The entire call
   * duration is infra overhead (BrowserStack latency, WDA snapshot) so
   * it is registered via `addOverhead`.
   * - Subsequent failed calls (element not yet visible) are NOT overhead
   * — the app is genuinely still loading during those calls.
   * - After detection a {@link probeOverhead} call measures the pure
   * per-command cost and registers it for subtraction.
   */
  private static async pollUntilVisible(
    el: PlaywrightElement,
    timeout: number,
  ): Promise<void> {
    const interval = 300;
    const start = Date.now();
    let attempt = 0;
    while (Date.now() - start < timeout - interval) {
      try {
        attempt++;
        const t0 = Date.now();
        const exists = await el.unwrap().isExisting();
        if (exists) {
          if (attempt === 1) {
            addOverhead(Date.now() - t0);
          }
          await this.probeOverhead(el);
          return;
        }
      } catch {
        // element not ready yet
      }
      await sleep(interval);
    }
    await el.waitForDisplayed({
      timeout: Math.max(interval, timeout - (Date.now() - start)),
    });
    await this.probeOverhead(el);
  }

  /**
   * Measures pure Appium/network overhead by running `isExisting()` on an
   * element that is already visible.  The entire call duration is infra cost
   * (network round-trip + WDA snapshot) with no app-loading component.
   */
  private static async probeOverhead(el: PlaywrightElement): Promise<void> {
    const t0 = Date.now();
    await el.unwrap().isExisting();
    addOverhead(Date.now() - t0);
  }

  /**
   * Asserts that a target element eventually becomes visible.
   *
   * When called inside a `TimerHelper.measure()` block two overhead sources
   * are automatically tracked and later subtracted:
   * - Element resolution (`await targetElement`) — the initial WebDriver
   * `findElement` call that resolves the selector.
   * - Post-detection probe — one extra `isExisting()` call after the element
   * is confirmed visible (see {@link probeOverhead}).
   */
  static async expectElementToBeVisible(
    targetElement: PlaywrightElement | Promise<PlaywrightElement>,
    options: AssertionOptions = {},
  ): Promise<void> {
    const t0 = Date.now();
    const el = await targetElement;
    addOverhead(Date.now() - t0);
    await this.pollUntilVisible(el, this.getTimeout(options));
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

  /**
   * Asserts that multiple elements become visible.
   *
   * Checks run sequentially because a WebDriver session serialises all
   * commands — `Promise.all` would not actually parallelise anything and
   * instead causes timeout and overhead-tracking issues.
   *
   * Sequential execution lets each element keep its full timeout and
   * reuses the per-element overhead tracking that already works for
   * single-element assertions.
   */
  static async expectAllElementsToBeVisible(
    elements: (PlaywrightElement | Promise<PlaywrightElement>)[],
    options: AssertionOptions = {},
  ): Promise<void> {
    for (const el of elements) {
      await this.expectElementToBeVisible(el, options);
    }
  }

  /**
   * Polls until an element's text content matches the expected value.
   *
   * Overhead tracking follows the same pattern as {@link pollUntilVisible}:
   * if the text already matches on the first attempt the entire call
   * duration is registered as infra overhead; a post-match probe captures
   * the per-command cost.
   */
  static async expectElementText(
    targetElement: PlaywrightElement | Promise<PlaywrightElement>,
    expected: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const t0Resolve = Date.now();
    const el = await targetElement;
    addOverhead(Date.now() - t0Resolve);

    const timeout = this.getTimeout(options);
    const interval = 300;
    const start = Date.now();
    let attempt = 0;
    while (Date.now() - start < timeout) {
      try {
        attempt++;
        const t0 = Date.now();
        const text = await el.textContent();
        if (text === expected) {
          if (attempt === 1) {
            addOverhead(Date.now() - t0);
          }
          await this.probeOverhead(el);
          return;
        }
      } catch {
        // element not ready yet
      }
      await sleep(interval);
    }
    throw new Error(`Expected element text "${expected}" within ${timeout}ms`);
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
