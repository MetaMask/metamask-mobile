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
  async tap(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.tap(asDetoxElement(elem), {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  async waitAndTap(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.waitAndTap(asDetoxElement(elem), {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

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

  async scrollToElement(
    target: EncapsulatedElementType,
    scrollView: EncapsulatedElementType | Promise<Detox.NativeMatcher>,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.scrollToElement(
      asDetoxElement(target),
      scrollView as Promise<Detox.NativeMatcher>,
      {
        timeout: opts?.timeout,
        elemDescription: opts?.description,
      },
    );
  }

  async longPress(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.longPress(asDetoxElement(elem), {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

  async dblTap(
    elem: EncapsulatedElementType,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await Gestures.dblTap(asDetoxElement(elem), {
      timeout: opts?.timeout,
      elemDescription: opts?.description,
    });
  }

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
  async tap(elem: EncapsulatedElementType): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.click();
  }

  async waitAndTap(elem: EncapsulatedElementType): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.click();
  }

  async typeText(elem: EncapsulatedElementType, text: string): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.fill(text);
  }

  async replaceText(
    elem: EncapsulatedElementType,
    text: string,
  ): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.clear();
    await el.fill(text);
  }

  async swipe(
    elem: EncapsulatedElementType,
    direction: 'up' | 'down' | 'left' | 'right',
  ): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await PlaywrightGestures.swipe(el, direction);
  }

  async scrollToElement(
    target: EncapsulatedElementType,
    _scrollView: EncapsulatedElementType | Promise<Detox.NativeMatcher>,
  ): Promise<void> {
    const el = await asPlaywrightElement(target);
    await PlaywrightGestures.scrollIntoView(el);
  }

  async longPress(elem: EncapsulatedElementType): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await PlaywrightGestures.longPress(el);
  }

  async dblTap(elem: EncapsulatedElementType): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.click();
    await el.click();
  }

  async tapAtPoint(
    elem: EncapsulatedElementType,
    point: { x: number; y: number },
  ): Promise<void> {
    const el = await asPlaywrightElement(elem);
    await el.tapOnCoordinates(point);
  }

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

    // Single element fallback — tap it directly
    const el = await asPlaywrightElement(elem);
    await el.click();
  }
}
