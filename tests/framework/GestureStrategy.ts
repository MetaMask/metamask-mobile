import Gestures from './Gestures.ts';
import PlaywrightGestures from './PlaywrightGestures.ts';
import { PlaywrightElement } from './PlaywrightAdapter.ts';
import {
  EncapsulatedElementType,
  asDetoxElement,
  asPlaywrightElement,
} from './EncapsulatedElement.ts';

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
}

/**
 * Element input for tapAtIndex — either a single element (Detox uses .atIndex())
 * or an array of elements (Appium selects by array index).
 */
export type TapAtIndexElement = EncapsulatedElementType | PlaywrightElement[];

/**
 * Strategy interface for framework-agnostic gesture execution.
 *
 * Each method accepts an `EncapsulatedElementType` (either DetoxElement or
 * Promise<PlaywrightElement>) so page objects never need to know which
 * framework is running.
 */
export interface GestureStrategy {
  tap(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  waitAndTap(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  typeText(
    elem: EncapsulatedElementType,
    text: string,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  replaceText(
    elem: EncapsulatedElementType,
    text: string,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  swipe(
    elem: EncapsulatedElementType,
    direction: 'up' | 'down' | 'left' | 'right',
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  scrollToElement(
    target: EncapsulatedElementType,
    scrollView: EncapsulatedElementType | Promise<Detox.NativeMatcher>,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  longPress(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  dblTap(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void>;

  tapAtPoint(
    elem: EncapsulatedElementType,
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
 * Detox implementation of GestureStrategy.
 *
 * Wraps the existing `Gestures` class, preserving all retry logic, stability
 * checks, and platform-specific scroll behaviour. `UnifiedGestureOptions` are
 * mapped to Detox-specific option shapes internally.
 */
export class DetoxGestureStrategy implements GestureStrategy {
  /**
   * Tap an element
   * @param elem - The element to tap
   * @param opts - The options for the tap
   * @returns A promise that resolves when the tap is complete
   */
  async tap(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.tap(asDetoxElement(elem), {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  /**
   * Wait for an element to be visible and then tap it
   * @param elem - The element to wait and tap
   * @param opts - The options for the wait and tap
   * @returns A promise that resolves when the wait and tap is complete
   */
  async waitAndTap(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.waitAndTap(asDetoxElement(elem), {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  /**
   * Type text into an element
   * @param elem - The element to type text into
   * @param text - The text to type
   * @param opts - The options for the type text
   * @returns A promise that resolves when the type text is complete
   */
  async typeText(
    elem: EncapsulatedElementType,
    text: string,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.typeText(asDetoxElement(elem), text, {
      hideKeyboard: true,
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  /**
   * Replace text in an element
   * @param elem - The element to replace text in
   * @param text - The text to replace
   * @param opts - The options for the replace text
   * @returns A promise that resolves when the replace text is complete
   */
  async replaceText(
    elem: EncapsulatedElementType,
    text: string,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.replaceText(asDetoxElement(elem), text, {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  /**
   * Swipe an element
   * @param elem - The element to swipe
   * @param direction - The direction to swipe
   * @param opts - The options for the swipe
   * @returns A promise that resolves when the swipe is complete
   */
  async swipe(
    elem: EncapsulatedElementType,
    direction: 'up' | 'down' | 'left' | 'right',
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.swipe(asDetoxElement(elem), direction, {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  /**
   * Scroll to an element
   * @param target - The element to scroll to
   * @param scrollView - The scroll view to scroll to
   * @param opts - The options for the scroll to element
   * @returns A promise that resolves when the scroll to element is complete
   */
  async scrollToElement(
    target: EncapsulatedElementType,
    scrollView: EncapsulatedElementType | Promise<Detox.NativeMatcher>,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    // Gestures.scrollToElement expects a Promise<NativeMatcher> (e.g. by.id()),
    // not a DetoxElement. EncapsulatedElementType resolves to a NativeElement,
    // which would cause element(scrollable) / whileElement(scrollable) to fail.
    // Only accept an actual NativeMatcher here.
    const scrollMatcher = scrollView as Promise<Detox.NativeMatcher>;
    await Gestures.scrollToElement(asDetoxElement(target), scrollMatcher, {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  /**
   * Long press an element
   * @param elem - The element to long press
   * @param opts - The options for the long press
   * @returns A promise that resolves when the long press is complete
   */
  async longPress(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.longPress(asDetoxElement(elem), {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  /**
   * Double tap an element
   * @param elem - The element to double tap
   * @param opts - The options for the double tap
   * @returns A promise that resolves when the double tap is complete
   */
  async dblTap(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.dblTap(asDetoxElement(elem), {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  /**
   * Tap at a point on an element
   * @param elem - The element to tap at a point on
   * @param point - The point to tap at
   * @param opts - The options for the tap at point
   * @returns A promise that resolves when the tap at point is complete
   */
  async tapAtPoint(
    elem: EncapsulatedElementType,
    point: { x: number; y: number },
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.tapAtPoint(asDetoxElement(elem), point, {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  /**
   * Tap at an index on an element
   * @param elem - The element to tap at an index on
   * @param index - The index to tap at
   * @param opts - The options for the tap at index
   * @returns A promise that resolves when the tap at index is complete
   */
  async tapAtIndex(
    elem: EncapsulatedElementType,
    index: number,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.tapAtIndex(asDetoxElement(elem), index, {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }
}

/**
 * Appium/WebdriverIO implementation of GestureStrategy.
 *
 * Wraps `PlaywrightElement` and `PlaywrightGestures`.
 */
export class AppiumGestureStrategy implements GestureStrategy {
  /**
   * Tap an element
   * @param elem - The element to tap
   * @returns A promise that resolves when the tap is complete
   */
  async tap(elem: EncapsulatedElementType): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.click();
  }

  /**
   * Wait for an element to be visible and then tap it
   * @param elem - The element to wait and tap
   * @returns A promise that resolves when the wait and tap is complete
   */
  async waitAndTap(elem: EncapsulatedElementType): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.click();
  }

  /**
   * Type text into an element
   * @param elem - The element to type text into
   * @param text - The text to type
   * @returns A promise that resolves when the type text is complete
   */
  async typeText(elem: EncapsulatedElementType, text: string): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.fill(text);
  }

  /**
   * Replace text in an element
   * @param elem - The element to replace text in
   * @param text - The text to replace
   * @returns A promise that resolves when the replace text is complete
   */
  async replaceText(
    elem: EncapsulatedElementType,
    text: string,
  ): Promise<void> {
    const el = await asPlaywrightElement(elem);
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
    elem: EncapsulatedElementType,
    direction: 'up' | 'down' | 'left' | 'right',
  ): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await PlaywrightGestures.swipe(el, direction);
  }

  /**
   * Scroll to an element
   * @param target - The element to scroll to
   * @param scrollView - The scroll view to scroll to
   * @returns A promise that resolves when the scroll to element is complete
   */
  async scrollToElement(
    target: EncapsulatedElementType,
    _scrollView: EncapsulatedElementType | Promise<Detox.NativeMatcher>,
  ): Promise<void> {
    const el = await asPlaywrightElement(target);
    await PlaywrightGestures.scrollIntoView(el);
  }

  /**
   * Long press an element
   * @param elem - The element to long press
   * @returns A promise that resolves when the long press is complete
   */
  async longPress(elem: EncapsulatedElementType): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await PlaywrightGestures.longPress(el);
  }

  /**
   * Double tap an element
   * @param elem - The element to double tap
   * @returns A promise that resolves when the double tap is complete
   */
  async dblTap(elem: EncapsulatedElementType): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.unwrap().doubleClick();
  }

  /**
   * Tap at a point on an element
   * @param elem - The element to tap at a point on
   * @param point - The point to tap at
   * @returns A promise that resolves when the tap at point is complete
   */
  async tapAtPoint(
    elem: EncapsulatedElementType,
    point: { x: number; y: number },
  ): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.tapOnCoordinates(point);
  }

  /**
   * Tap at an index on an element
   * @param elem - The element to tap at an index on
   * @param index - The index to tap at
   * @returns A promise that resolves when the tap at index is complete
   */
  async tapAtIndex(elem: TapAtIndexElement, index: number): Promise<void> {
    // If an array of PlaywrightElements is provided, tap the one at `index`
    if (Array.isArray(elem)) {
      const elements = elem as PlaywrightElement[];
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
        `tapAtIndex: Appium requires a PlaywrightElement[] array for index > 0. ` +
          `Received single element with index ${index}.`,
      );
    }
    const el = await asPlaywrightElement(elem);
    await el.click();
  }
}
