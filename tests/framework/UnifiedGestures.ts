import type { AppiumElement } from './AppiumElement.ts';
import {
  GestureStrategy,
  UnifiedGestureOptions,
  TapAtIndexElement,
  type ScrollContainer,
  AppiumGestureStrategy,
} from './GestureStrategy.ts';
import { resolve, isSelector, type Selector } from './Selector.ts';

/**
 * UnifiedGestures — Internal Appium gesture facade.
 *
 * Resolves Selectors then delegates to AppiumGestureStrategy. Page objects
 * and specs must call `Gestures` instead of this class.
 */
export default class UnifiedGestures {
  private static _strategy: GestureStrategy | null = null;

  /** Lazily resolve and cache the Appium strategy */
  private static get strategy(): GestureStrategy {
    if (!this._strategy) {
      this._strategy = new AppiumGestureStrategy();
    }
    return this._strategy;
  }

  /** Reset the cached strategy (useful in tests) */
  static resetStrategy(): void {
    this._strategy = null;
  }

  /**
   * Resolve scroll container for scrollToElement.
   * `string` testID is passed through for Appium scrollableElement resolution.
   */
  private static resolveScrollContainer(
    scrollView?: ScrollContainer,
  ): ScrollContainer | undefined {
    return scrollView;
  }

  // ── Gesture Methods ─────────────────────────────────────────

  static async tap(
    elem: AppiumElement | Promise<AppiumElement> | Selector,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.tap(isSelector(elem) ? resolve(elem) : elem, opts);
  }

  static async waitAndTap(
    elem: AppiumElement | Promise<AppiumElement> | Selector,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.waitAndTap(
      isSelector(elem) ? resolve(elem) : elem,
      opts,
    );
  }

  static async typeText(
    elem: AppiumElement | Promise<AppiumElement> | Selector,
    text: string,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.typeText(
      isSelector(elem) ? resolve(elem) : elem,
      text,
      opts,
    );
  }

  static async replaceText(
    elem: AppiumElement | Promise<AppiumElement> | Selector,
    text: string,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.replaceText(
      isSelector(elem) ? resolve(elem) : elem,
      text,
      opts,
    );
  }

  static async swipe(
    elem: AppiumElement | Promise<AppiumElement> | Selector,
    direction: 'up' | 'down' | 'left' | 'right',
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.swipe(
      isSelector(elem) ? resolve(elem) : elem,
      direction,
      opts,
    );
  }

  static async scrollToElement(
    target: AppiumElement | Promise<AppiumElement> | Selector,
    scrollView?: ScrollContainer,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.scrollToElement(
      isSelector(target) ? resolve(target) : target,
      this.resolveScrollContainer(scrollView),
      opts,
    );
  }

  static async longPress(
    elem: AppiumElement | Promise<AppiumElement> | Selector,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.longPress(
      isSelector(elem) ? resolve(elem) : elem,
      opts,
    );
  }

  static async dblTap(
    elem: AppiumElement | Promise<AppiumElement> | Selector,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.dblTap(isSelector(elem) ? resolve(elem) : elem, opts);
  }

  static async tapAtPoint(
    elem: AppiumElement | Promise<AppiumElement> | Selector,
    point: { x: number; y: number },
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.tapAtPoint(
      isSelector(elem) ? resolve(elem) : elem,
      point,
      opts,
    );
  }

  static async tapAtIndex(
    elem: TapAtIndexElement,
    index: number,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.tapAtIndex(elem, index, opts);
  }
}
