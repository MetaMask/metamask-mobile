import AppiumGestures from './AppiumGestures.ts';
import Matchers from './Matchers.ts';
import { AppiumElement, type AppiumElementRef } from './AppiumElement.ts';
import type { ScrollContainer } from './types.ts';
import { getDriver } from './AppiumUtilities.ts';
import { PlatformDetector } from './PlatformLocator.ts';

export type { ScrollContainer, ScrollViewMatcher } from './types.ts';

/**
 * Unified options for gesture methods.
 * Framework-specific options (e.g. Detox's checkStability, hideKeyboard) are
 * handled internally by each strategy — page objects only deal with these
 * universal options.
 */
export interface UnifiedGestureOptions {
  /** Maximum time (ms) to wait for the element before timing out */
  timeout?: number;
  /** Human-readable description for logging and error messages */
  description?: string;
  /** Swipe speed — Detox only; Appium ignores this */
  speed?: 'fast' | 'slow';
  /** Swipe percentage (0–1) — Detox only; Appium ignores this */
  percentage?: number;
  /** Scroll direction — used by scrollToElement (Detox default and Appium scrollIntoView) */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Scroll amount in px — Detox only; used by scrollToElement */
  scrollAmount?: number;
  /** Delay before tapping (ms) */
  delay?: number;
  /** Wait for element position to stabilize before tapping — Detox only */
  checkStability?: boolean;
  /** Check if the element is displayed — Appium only; Detox ignores this */
  checkForDisplayed?: boolean;
  /** Check if the element is enabled — Appium only; Detox ignores this */
  checkForEnabled?: boolean;
  /** Stricter enabled polling (Android attrs + stable reads) — Appium only */
  waitForInteractive?: boolean;
  /** Wait for element position to stabilize before tap — Appium only */
  checkForStable?: boolean;
  /** Consecutive interactive polls required before tap — Appium only */
  enabledStableReads?: number;
  /** Extra wait (ms) after enabled/interactive, before click — Appium only */
  postEnabledSettleMs?: number;
  /** Long press duration in ms — passed through to AppiumGestures.longPress */
  duration?: number;
  /** Dismiss the keyboard after typing. Default: true */
  hideKeyboard?: boolean;
  /** Clear the field before typing — Detox only; Appium fill() replaces by default */
  clearFirst?: boolean;
}

/**
 * Element input for tapAtIndex — single element or an array (select by index).
 */
export type TapAtIndexElement = AppiumElementRef | AppiumElement[];

/**
 * Strategy interface for framework-agnostic gesture execution.
 *
 * Each method accepts an `AppiumElementRef` (AppiumElementRef).
 */
export interface GestureStrategy {
  tap(elem: AppiumElementRef, opts?: UnifiedGestureOptions): Promise<void>;

  waitAndTap(
    elem: AppiumElementRef,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  typeText(
    elem: AppiumElementRef,
    text: string,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  replaceText(
    elem: AppiumElementRef,
    text: string,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  swipe(
    elem: AppiumElementRef,
    direction: 'up' | 'down' | 'left' | 'right',
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  scrollToElement(
    target: AppiumElementRef,
    scrollView?: ScrollContainer,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  longPress(
    elem: AppiumElementRef,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  dblTap(elem: AppiumElementRef, opts?: UnifiedGestureOptions): Promise<void>;

  tapAtPoint(
    elem: AppiumElementRef,
    point: { x: number; y: number },
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  tapAtIndex(
    elem: TapAtIndexElement,
    index: number,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;
}

/**
 * Appium/WebdriverIO implementation of GestureStrategy.
 *
 * Wraps `AppiumElement` and `AppiumGestures`.
 */
export class AppiumGestureStrategy implements GestureStrategy {
  /**
   * Detox scroll direction is inverted relative to Appium scrollIntoView swipe
   * direction for vertical scrolling (scroll down → swipe up).
   */
  private static toScrollIntoViewDirection(
    direction?: UnifiedGestureOptions['direction'],
  ): 'up' | 'down' | 'left' | 'right' {
    if (direction === 'down') {
      return 'up';
    }
    if (direction === 'up') {
      return 'down';
    }
    return direction ?? 'up';
  }

  private static async resolveScrollableElement(
    scrollView?: ScrollContainer,
  ): Promise<AppiumElement | undefined> {
    if (typeof scrollView !== 'string') {
      return undefined;
    }
    return Matchers.getElementByID(scrollView);
  }

  /**
   * Tap an element
   * @param elem - The element to tap
   * @returns A promise that resolves when the tap is complete
   */
  async tap(
    elem: AppiumElementRef,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    const el = await elem;
    await AppiumGestures.waitAndTap(el, {
      timeout: opts?.timeout,
      delay: opts?.delay,
      checkForDisplayed: opts?.checkForDisplayed ?? true,
      checkForEnabled: opts?.checkForEnabled,
    });
  }

  /**
   * Wait for an element to be visible and then tap it
   * @param elem - The element to wait and tap
   * @param opts - The options for the wait and tap
   * @returns A promise that resolves when the wait and tap is complete
   */
  async waitAndTap(
    elem: AppiumElementRef,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    const el = await elem;
    await AppiumGestures.waitAndTap(el, {
      timeout: opts?.timeout,
      delay: opts?.delay,
      checkForDisplayed: opts?.checkForDisplayed ?? true,
      checkForEnabled: opts?.checkForEnabled,
      waitForInteractive: opts?.waitForInteractive,
      checkForStable: opts?.checkForStable,
      enabledStableReads: opts?.enabledStableReads,
      postEnabledSettleMs: opts?.postEnabledSettleMs,
    });
  }

  /**
   * Type text into an element
   * @param elem - The element to type text into
   * @param text - The text to type
   * @returns A promise that resolves when the type text is complete
   */
  async typeText(
    elem: AppiumElementRef,
    text: string,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    const el = await elem;
    await el.fill(text);

    if (opts?.hideKeyboard ?? true) {
      await AppiumGestures.hideKeyboard();
    }
  }

  /**
   * Replace text in an element
   * @param elem - The element to replace text in
   * @param text - The text to replace
   * @param opts - Optional timeout / readiness options
   * @returns A promise that resolves when the replace text is complete
   */
  async replaceText(
    elem: AppiumElementRef,
    text: string,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    const timeout = opts?.timeout ?? 15_000;
    const el = await elem;
    // Wait for a fresh displayed node before clearValue — otherwise Appium
    // fails with "Can't call clearValue ... because element wasn't found"
    // when navigation to the input screen is still settling.
    await el.waitForDisplayed({
      timeout,
      timeoutMsg: opts?.description
        ? `${opts.description} was not displayed within ${timeout}ms`
        : `Element was not displayed within ${timeout}ms before replaceText`,
    });
    await el.clear();
    await el.fill(text);
  }

  /**
   * Swipe an element
   * @param elem - The element to swipe
   * @param direction - The direction to swipe
   * @returns A promise that resolves when the swipe is complete
   */
  async swipe(
    elem: AppiumElementRef,
    direction: 'up' | 'down' | 'left' | 'right',
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    const percent = opts?.percentage ?? 0.75;

    if (direction === 'left' || direction === 'right') {
      await AppiumGestures.swipe({
        scrollParams: { direction },
        percent,
      });
      return;
    }

    await this.scrollWithinContainer(elem, direction, percent);
  }

  private async scrollWithinContainer(
    scrollView: AppiumElementRef,
    swipeDirection: 'up' | 'down' | 'left' | 'right',
    percent = 0.6,
  ): Promise<void> {
    // XCUITest does not implement `mobile: scrollGesture` (Android-only).
    if (PlatformDetector.isIOS()) {
      const container = await scrollView;
      const location = await container.unwrap().getLocation();
      const size = await container.unwrap().getSize();
      const centerX = Math.floor(location.x + size.width / 2);
      const travel = Math.floor(
        size.height * Math.min(Math.max(percent, 0.1), 0.9),
      );

      if (swipeDirection === 'up' || swipeDirection === 'down') {
        const fromY =
          swipeDirection === 'up'
            ? location.y + Math.floor(size.height * 0.8)
            : location.y + Math.floor(size.height * 0.2);
        const toY = swipeDirection === 'up' ? fromY - travel : fromY + travel;

        await AppiumGestures.swipe({
          scrollParams: { direction: swipeDirection },
          percent,
          duration: 600,
          from: { x: centerX, y: fromY },
          to: { x: centerX, y: toY },
        });
        return;
      }

      await AppiumGestures.swipe({
        scrollParams: { direction: swipeDirection },
        percent,
        duration: 600,
      });
      return;
    }

    const drv = getDriver();
    if (!drv) {
      throw new Error('Driver is not available');
    }

    const container = await scrollView;
    const location = await container.unwrap().getLocation();
    const size = await container.unwrap().getSize();

    await drv.execute('mobile: scrollGesture', {
      left: location.x,
      top: location.y,
      width: size.width,
      height: size.height,
      direction: swipeDirection,
      percent,
    });
  }

  /**
   * Scroll to an element
   * @param target - The element to scroll to
   * @param scrollView - The scroll view to scroll to
   * @returns A promise that resolves when the scroll to element is complete
   */
  async scrollToElement(
    target: AppiumElementRef,
    scrollView?: ScrollContainer,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    const el = await target;
    const scrollableElement =
      await AppiumGestureStrategy.resolveScrollableElement(scrollView);

    // Cap scrolls so a missing target fails in tens of seconds instead of
    // burning a 3-minute Playwright timeout (each miss is ~5s of findElement).
    const maxScrolls = opts?.timeout
      ? Math.max(3, Math.min(12, Math.ceil(opts.timeout / 5000)))
      : 10;

    await AppiumGestures.scrollIntoView(el, {
      scrollParams: {
        direction: AppiumGestureStrategy.toScrollIntoViewDirection(
          opts?.direction,
        ),
      },
      scrollableElement,
      maxScrolls,
    });
  }

  /**
   * Long press an element
   * @param elem - The element to long press
   * @returns A promise that resolves when the long press is complete
   */
  async longPress(
    elem: AppiumElementRef,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    const el = await elem;
    await AppiumGestures.longPress(el, opts?.duration);
  }

  /**
   * Double tap an element
   * @param elem - The element to double tap
   * @returns A promise that resolves when the double tap is complete
   */
  async dblTap(elem: AppiumElementRef): Promise<void> {
    const el = await elem;
    await AppiumGestures.dblTap(el);
  }

  /**
   * Tap at a point on an element
   * @param elem - The element to tap at a point on
   * @param point - The point to tap at
   * @returns A promise that resolves when the tap at point is complete
   */
  async tapAtPoint(
    elem: AppiumElementRef,
    point: { x: number; y: number },
  ): Promise<void> {
    const el = await elem;
    await el.tapOnCoordinates(point);
  }

  /**
   * Tap at an index on an element
   * @param elem - The element to tap at an index on
   * @param index - The index to tap at
   * @returns A promise that resolves when the tap at index is complete
   */
  async tapAtIndex(elem: TapAtIndexElement, index: number): Promise<void> {
    // If an array of AppiumElements is provided, tap the one at `index`
    if (Array.isArray(elem)) {
      const elements = elem as AppiumElement[];
      if (index < 0 || index >= elements.length) {
        throw new Error(
          `tapAtIndex: index ${index} is out of bounds (${elements.length} elements)`,
        );
      }
      await elements[index].click();
      return;
    }

    // Single element: allow index 0 as a pass-through, reject anything else
    if (index !== 0) {
      throw new Error(
        `tapAtIndex: Appium requires a AppiumElement[] array for index > 0. ` +
          `Received single element with index ${index}.`,
      );
    }
    const el = await elem;
    await el.click();
  }
}
