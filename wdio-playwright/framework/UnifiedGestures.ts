import {
  FrameworkDetector,
  EncapsulatedElementType,
} from './EncapsulatedElement';
import Gestures from '../../e2e/framework/Gestures';
import PlaywrightGestures from './PlaywrightGestures';
import { PlaywrightElement } from './PlaywrightAdapter';
import {
  TapOptions,
  TypeTextOptions,
  SwipeOptions,
  LongPressOptions,
} from '../../e2e/framework/types';

/**
 * UnifiedGestures - Gestures that work with both Detox and WebdriverIO
 *
 * This class provides a unified API for common gestures across both frameworks.
 * It automatically detects the framework and proxies to the appropriate implementation:
 * - Detox → e2e/framework/Gestures
 * - WebdriverIO → wdio-playwright/framework/PlaywrightGestures
 *
 * For complex scenarios or framework-specific options, you can still use
 * Gestures or PlaywrightGestures directly.
 *
 * @example
 * // Clean, unified API
 * await UnifiedGestures.tap(element, { elemDescription: 'My Button' });
 *
 * @example
 * // For complex cases, use framework-specific Gestures directly
 * if (FrameworkDetector.isDetox()) {
 *   await Gestures.tap(element as DetoxElement, {
 *     checkStability: true,
 *     clearFirst: true,
 *     // ... all Detox Gestures options
 *   });
 * }
 */
export default class UnifiedGestures {
  /**
   * Tap an element
   * Proxies to Gestures.tap (Detox) or PlaywrightGestures.tap (WebdriverIO)
   *
   * @example
   * await UnifiedGestures.tap(element, { elemDescription: 'Submit Button' });
   */
  static async tap(
    element: EncapsulatedElementType,
    options?: TapOptions,
  ): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      await Gestures.tap(element as DetoxElement, options);
    } else {
      const elem = (await element) as PlaywrightElement;
      await PlaywrightGestures.tap(elem);
    }
  }

  /**
   * Wait and tap an element (with delay)
   * Proxies to Gestures.waitAndTap (Detox) or PlaywrightGestures.tap (WebdriverIO)
   *
   * @example
   * await UnifiedGestures.waitAndTap(element, { elemDescription: 'Button', timeout: 5000 });
   */
  static async waitAndTap(
    element: EncapsulatedElementType,
    options?: TapOptions,
  ): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      await Gestures.waitAndTap(element as DetoxElement, options);
    } else {
      const elem = (await element) as PlaywrightElement;
      await PlaywrightGestures.tap(elem);
    }
  }

  /**
   * Type text into an element
   * Proxies to Gestures.typeText (Detox) or PlaywrightGestures.type (WebdriverIO)
   *
   * @example
   * await UnifiedGestures.typeText(element, 'Hello World', { timeout: 5000 });
   */
  static async typeText(
    element: EncapsulatedElementType,
    text: string,
    options?: TypeTextOptions,
  ): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      await Gestures.typeText(element as DetoxElement, text, options);
    } else {
      const elem = (await element) as PlaywrightElement;
      await PlaywrightGestures.type(elem, text);
    }
  }

  /**
   * Replace text in an element (clear and type new text)
   * Proxies to Gestures.replaceText (Detox) or PlaywrightGestures.fill (WebdriverIO)
   *
   * @example
   * await UnifiedGestures.replaceText(element, 'New Text', { timeout: 5000 });
   */
  static async replaceText(
    element: EncapsulatedElementType,
    text: string,
    options?: { timeout?: number },
  ): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      await Gestures.replaceText(element as DetoxElement, text, options);
    } else {
      const elem = (await element) as PlaywrightElement;
      await PlaywrightGestures.fill(elem, text);
    }
  }

  /**
   * Clear text from an element
   * Proxies to Gestures.replaceText(element, '') (Detox) or PlaywrightGestures.clear (WebdriverIO)
   *
   * @example
   * await UnifiedGestures.clearText(element);
   */
  static async clearText(element: EncapsulatedElementType): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      await Gestures.replaceText(element as DetoxElement, '');
    } else {
      const elem = (await element) as PlaywrightElement;
      await PlaywrightGestures.clear(elem);
    }
  }

  /**
   * Swipe element in a direction
   * Proxies to Gestures.swipe (Detox) or PlaywrightGestures.swipe (WebdriverIO)
   *
   * @example
   * await UnifiedGestures.swipe(element, 'up', { speed: 'fast' });
   */
  static async swipe(
    element: EncapsulatedElementType,
    direction: 'up' | 'down' | 'left' | 'right',
    options?: SwipeOptions,
  ): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      await Gestures.swipe(element as DetoxElement, direction, options);
    } else {
      const elem = (await element) as PlaywrightElement;
      await PlaywrightGestures.swipe(elem, direction, options?.speed || 'fast');
    }
  }

  /**
   * Long press an element
   * Proxies to Gestures.longPress (Detox) or PlaywrightGestures.longPress (WebdriverIO)
   *
   * @example
   * await UnifiedGestures.longPress(element, { duration: 2000 });
   */
  static async longPress(
    element: EncapsulatedElementType,
    options?: LongPressOptions,
  ): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      await Gestures.longPress(element as DetoxElement, options);
    } else {
      const elem = (await element) as PlaywrightElement;
      await PlaywrightGestures.longPress(elem, options?.duration || 1000);
    }
  }

  /**
   * Scroll to element
   * Uses native element.scrollTo (Detox) or PlaywrightGestures.scrollIntoView (WebdriverIO)
   *
   * @example
   * await UnifiedGestures.scrollToElement(element, 'bottom');
   */
  static async scrollToElement(
    element: EncapsulatedElementType,
    edge: 'top' | 'bottom' = 'bottom',
  ): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      const elem =
        (await (element as DetoxElement)) as Detox.IndexableNativeElement;
      await elem.scrollTo(edge);
    } else {
      const elem = (await element) as PlaywrightElement;
      await PlaywrightGestures.scrollIntoView(elem);
    }
  }

  /**
   * Multi-tap an element
   * Uses native element.multiTap (Detox) or multiple taps (WebdriverIO)
   *
   * @example
   * await UnifiedGestures.multiTap(element, 3);
   */
  static async multiTap(
    element: EncapsulatedElementType,
    times: number,
  ): Promise<void> {
    if (FrameworkDetector.isDetox()) {
      const elem =
        (await (element as DetoxElement)) as Detox.IndexableNativeElement;
      await elem.multiTap(times);
    } else {
      // WebdriverIO: simulate with multiple taps
      for (let i = 0; i < times; i++) {
        await this.tap(element);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
}
