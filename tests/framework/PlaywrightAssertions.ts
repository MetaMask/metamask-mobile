import Utilities, { BASE_DEFAULTS, sleep } from './Utilities.ts';
import { AssertionOptions } from './types.ts';
import type { PlaywrightElement } from './PlaywrightAdapter.ts';
import PlaywrightMatchers from './PlaywrightMatchers.ts';
import PlaywrightGestures from './PlaywrightGestures.ts';
import { PlatformDetector } from './PlatformLocator.ts';
import {
  addOverhead,
  addOverheadSleep,
  isOverheadTrackingActive,
  recordFailedPollCommand,
  recordOverheadProbe,
  recordSuccessPollCommand,
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
 * While `TimerHelper.measure()` is active we accumulate infra cost and
 * subtract it from wall-clock after the assertion:
 *
 * 1. **Element resolution** — initial findElement (`addOverhead`).
 * 2. **Failed poll commands** — `min(duration, rtt + implicitWait)` per miss.
 * 3. **Success poll** — full duration (element already on screen).
 * 4. **Poll sleeps** — intentional intervals between attempts.
 * 5. **Overhead probe** — post-detect `isExisting` (RTT calibration + infra).
 */
export default class PlaywrightAssertions {
  private static getTimeout(options: AssertionOptions): number {
    return options.timeout ?? BASE_DEFAULTS.timeout;
  }

  /**
   * Polls for element existence using a single WebDriver command per attempt
   * (`isExisting`). This avoids the multiple internal HTTP round-trips that
   * WebdriverIO's `waitForDisplayed` performs on each iteration.
   *
   * When `measure()` overhead tracking is active we use a shorter sleep between
   * attempts so detection lag (screen already up on video, Appium still polling)
   * stays smaller.
   */
  private static readonly FINAL_WAIT_RESERVE_MS = 2_000;
  /** Fast implicit wait for poll probes — avoids 3.5s find penalty per attempt. */
  private static readonly POLL_IMPLICIT_WAIT_MS = 300;
  private static readonly POLL_INTERVAL_MS = 300;
  private static readonly POLL_INTERVAL_WHILE_MEASURING_MS = 50;

  private static async pollUntilVisible(
    el: PlaywrightElement,
    timeout: number,
  ): Promise<void> {
    const tracking = isOverheadTrackingActive();
    const interval = tracking
      ? this.POLL_INTERVAL_WHILE_MEASURING_MS
      : this.POLL_INTERVAL_MS;
    const start = Date.now();
    while (Date.now() - start < timeout - this.FINAL_WAIT_RESERVE_MS) {
      const remaining = timeout - (Date.now() - start);
      if (remaining <= 0) {
        break;
      }
      const t0 = Date.now();
      try {
        const exists = await withImplicitWait(this.POLL_IMPLICIT_WAIT_MS, () =>
          el.unwrap().isExisting(),
        );
        if (exists) {
          const displayed = await el.isVisible();
          if (displayed) {
            if (tracking) {
              recordSuccessPollCommand(Date.now() - t0);
              await this.probeOverhead(el);
            }
            return;
          }
        }
        if (tracking) {
          recordFailedPollCommand(Date.now() - t0);
        }
      } catch {
        if (tracking) {
          recordFailedPollCommand(Date.now() - t0);
        }
      }
      const sleepMs = Math.min(interval, remaining);
      if (tracking) {
        addOverheadSleep(sleepMs);
      }
      await sleep(sleepMs);
    }
    const remainingTimeout = timeout - (Date.now() - start);
    const t0Final = Date.now();
    await el.waitForDisplayed({
      timeout: Math.max(interval, remainingTimeout),
    });
    if (isOverheadTrackingActive()) {
      recordSuccessPollCommand(Date.now() - t0Final);
      await this.probeOverhead(el);
    }
  }

  /**
   * Measures pure Appium/network overhead by running `isExisting()` on an
   * element that is already visible. Used as RTT calibration and infra cost.
   */
  private static async probeOverhead(el: PlaywrightElement): Promise<void> {
    const t0 = Date.now();
    await el.unwrap().isExisting();
    recordOverheadProbe(Date.now() - t0);
  }

  /**
   * Asserts that a target element eventually becomes visible.
   *
   * When called inside a `TimerHelper.measure()` block, Appium infra overhead
   * (resolution, poll commands, sleeps, probe) is tracked and subtracted.
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
   * Overhead tracking mirrors {@link pollUntilVisible}: failed/success poll
   * commands, sleeps, and a post-match probe for RTT calibration.
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
    const tracking = isOverheadTrackingActive();
    const interval = tracking ? 50 : 300;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const t0 = Date.now();
        const text = await el.textContent();
        if (text === expected) {
          if (tracking) {
            recordSuccessPollCommand(Date.now() - t0);
            await this.probeOverhead(el);
          }
          return;
        }
        if (tracking) {
          recordFailedPollCommand(Date.now() - t0);
        }
      } catch {
        // element not ready yet
      }
      if (tracking) {
        addOverheadSleep(interval);
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
      try {
        if (!(await el.unwrap().isExisting())) {
          return;
        }
      } catch {
        // Fall through to waitForDisplayed when existence cannot be determined.
      }
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
      if (
        error instanceof TypeError &&
        error.message.includes('waitForDisplayed')
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

  static async expectElementToHaveLabel(
    targetElement: PlaywrightElement | Promise<PlaywrightElement>,
    expectedLabel: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const timeout = this.getTimeout(options);
    const interval = 300;
    const start = Date.now();
    const el = await targetElement;

    const normalize = (value: string): string =>
      value
        .replace(/[\s,]+/g, ' ')
        .trim()
        .toLowerCase();

    const matchesLabel = (actual: string): boolean => {
      const normalizedActual = normalize(actual);
      const normalizedExpected = normalize(expectedLabel);
      if (normalizedActual.includes(normalizedExpected)) {
        return true;
      }

      return expectedLabel
        .split(',')
        .map((part) => normalize(part))
        .every((part) => part.length > 0 && normalizedActual.includes(part));
    };

    while (Date.now() - start < timeout) {
      const label = await this.getElementAccessibilityLabel(el);
      if (matchesLabel(label)) {
        return;
      }
      await sleep(interval);
    }

    const lastLabel = await this.getElementAccessibilityLabel(el);
    throw new Error(
      `Expected label "${expectedLabel}" but got "${lastLabel}" within ${timeout}ms`,
    );
  }

  private static async getElementAccessibilityLabel(
    el: PlaywrightElement,
  ): Promise<string> {
    const raw = el.unwrap();
    const isAndroid = await PlatformDetector.isAndroid();
    const accessibilityText = isAndroid
      ? ((await raw.getAttribute('content-desc')) ?? '')
      : ((await raw.getAttribute('label')) ??
        (await raw.getAttribute('name')) ??
        '');
    let text = '';
    try {
      text = await raw.getText();
    } catch {
      text = '';
    }
    return [accessibilityText, text].filter(Boolean).join(', ');
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
