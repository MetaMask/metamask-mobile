import Utilities, { BASE_DEFAULTS, sleep } from './Utilities.ts';
import { AssertionOptions } from './types.ts';
import type { PlaywrightElement } from './PlaywrightAdapter.ts';
import PlaywrightMatchers from './PlaywrightMatchers.ts';
import PlaywrightGestures from './PlaywrightGestures.ts';
import {
  addOverhead,
  isOverheadTrackingActive,
  withImplicitWait,
} from './PlaywrightUtilities.ts';
import { createPlaywrightLogger } from './playwrightLogger.ts';

const logger = createPlaywrightLogger('PlaywrightAssertions');

export interface VisibilityWithSettleOptions extends AssertionOptions {
  settleMs?: number;
}

export interface TextDisplayedOptions extends AssertionOptions {
  /** When set, asserts text on this element instead of searching the screen. */
  within?: PlaywrightElement | Promise<PlaywrightElement>;
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
  private static readonly FINAL_WAIT_RESERVE_MS = 2_000;
  /** Fast implicit wait for poll probes — avoids 3.5s find penalty per attempt. */
  private static readonly POLL_IMPLICIT_WAIT_MS = 300;

  private static async pollUntilVisible(
    el: PlaywrightElement,
    timeout: number,
  ): Promise<void> {
    const interval = 300;
    const start = Date.now();
    let attempt = 0;
    while (Date.now() - start < timeout - this.FINAL_WAIT_RESERVE_MS) {
      const remaining = timeout - (Date.now() - start);
      if (remaining <= 0) {
        break;
      }
      try {
        attempt++;
        const t0 = Date.now();
        const exists = await withImplicitWait(this.POLL_IMPLICIT_WAIT_MS, () =>
          el.unwrap().isExisting(),
        );
        if (exists) {
          const displayed = await el.isVisible();
          if (displayed) {
            if (isOverheadTrackingActive()) {
              addOverhead(Date.now() - t0);
            }
            return;
          }
        }
      } catch {
        // element not ready yet
      }
      await sleep(Math.min(interval, remaining));
    }
    const remainingTimeout = timeout - (Date.now() - start);
    await el.waitForDisplayed({
      timeout: Math.max(interval, remainingTimeout),
    });
    if (isOverheadTrackingActive()) {
      await this.probeOverhead(el);
    }
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
    if (isOverheadTrackingActive()) {
      addOverhead(Date.now() - t0);
    }
    logger.debug('Waiting for element to be visible');
    await this.pollUntilVisible(el, this.getTimeout(options));
  }

  /**
   * Waits until an element stays enabled (and on Android, native attrs are not false).
   * Prefer waitForInteractive on waitAndTap for tap flows.
   */
  static async expectElementToBeInteractive(
    targetElement: PlaywrightElement | Promise<PlaywrightElement>,
    options: AssertionOptions = {},
  ): Promise<void> {
    const el = await targetElement;
    await PlaywrightGestures.waitUntilInteractive(
      el,
      this.getTimeout(options),
      {
        requiredStableReads: 3,
      },
    );
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
    if (isOverheadTrackingActive()) {
      addOverhead(Date.now() - t0Resolve);
    }

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
          if (isOverheadTrackingActive()) {
            await this.probeOverhead(el);
          }
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
    try {
      const el = await targetElement;
      await el.waitForDisplayed({
        reverse: true,
        timeout: this.getTimeout(options),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('No elements found for XPath') ||
          error.message.includes('An element could not be located') ||
          error.message.includes('no such element'))
      ) {
        return;
      }
      throw error;
    }
  }

  static async expectTextDisplayed(
    text: string,
    options: TextDisplayedOptions = {},
  ): Promise<void> {
    const { within, ...assertionOptions } = options;
    if (within) {
      await this.expectElementText(within, text, assertionOptions);
      return;
    }
    const timeout = this.getTimeout(assertionOptions);
    return Utilities.executeWithRetry(
      async () => {
        const el = await PlaywrightMatchers.getElementByText(text);
        await el.waitForDisplayed({ timeout: 100 });
      },
      {
        timeout,
        description: `Assert text "${text}" is displayed`,
      },
    );
  }

  static async expectTextNotDisplayed(
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    try {
      const el = await PlaywrightMatchers.getElementByText(text);
      await el.waitForDisplayed({
        reverse: true,
        timeout: this.getTimeout(options),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('No elements found for XPath') ||
          error.message.includes('No elements found'))
      ) {
        return;
      }
      throw error;
    }
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
        logger.debug(`Condition not met on attempt ${i + 1}/${maxRetries}`);
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }
    throw lastError;
  }
}
