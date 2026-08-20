import { FrameworkDetector } from './FrameworkDetector.ts';
import { EncapsulatedElementType } from './EncapsulatedElement.ts';
import {
  GestureStrategy,
  UnifiedGestureOptions,
  TapAtIndexElement,
  type ScrollContainer,
  DetoxGestureStrategy,
  AppiumGestureStrategy,
} from './GestureStrategy.ts';
import Matchers from './Matchers.ts';
import { resolve, isSelector, type Selector } from './Selector.ts';

/**
 * UnifiedGestures — Static facade for framework-agnostic gesture execution.
 *
 * The framework strategy is resolved **once** on first use and cached for the
 * lifetime of the test run.  Page objects call these static methods directly
 * and never need to know whether Detox or Appium is running.
 *
 * @example
 * ```typescript
 * import { UnifiedGestures } from '../framework';
 *
 * class LoginView {
 *   get passwordInput(): EncapsulatedElementType { ... }
 *
 *   async enterPassword(password: string) {
 *     await UnifiedGestures.typeText(this.passwordInput, password);
 *   }
 * }
 * ```
 */
export default class UnifiedGestures {
  private static _strategy: GestureStrategy | null = null;

  /** Lazily resolve and cache the active strategy */
  private static get strategy(): GestureStrategy {
    if (!this._strategy) {
      this._strategy = FrameworkDetector.isDetox()
        ? new DetoxGestureStrategy()
        : new AppiumGestureStrategy();
    }
    return this._strategy;
  }

  /** Reset the cached strategy (useful in tests) */
  static resetStrategy(): void {
    this._strategy = null;
  }

  /**
   * Resolve scroll container for scrollToElement.
   * - `string` testID → Detox matcher via Matchers.getIdentifier; passed through on Appium.
   * - `EncapsulatedElementType` → passed through for Appium scrollableElement resolution.
   * - `ScrollViewMatcher` → Detox-only matcher promise.
   */
  private static resolveScrollContainer(
    scrollView?: ScrollContainer,
  ): ScrollContainer | undefined {
    if (scrollView === undefined) {
      return undefined;
    }
    if (typeof scrollView === 'string') {
      if (FrameworkDetector.isAppium()) {
        return scrollView;
      }
      return Matchers.getIdentifier(scrollView);
    }
    return scrollView;
  }

  // ── Gesture Methods ─────────────────────────────────────────

  static async tap(
    elem: EncapsulatedElementType | Selector,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.tap(isSelector(elem) ? resolve(elem) : elem, opts);
  }

  static async waitAndTap(
    elem: EncapsulatedElementType | Selector,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.waitAndTap(
      isSelector(elem) ? resolve(elem) : elem,
      opts,
    );
  }

  static async typeText(
    elem: EncapsulatedElementType | Selector,
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
    elem: EncapsulatedElementType | Selector,
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
    elem: EncapsulatedElementType | Selector,
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
    target: EncapsulatedElementType | Selector,
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
    elem: EncapsulatedElementType | Selector,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.longPress(
      isSelector(elem) ? resolve(elem) : elem,
      opts,
    );
  }

  static async dblTap(
    elem: EncapsulatedElementType | Selector,
    opts?: UnifiedGestureOptions,
  ): Promise<void> {
    await this.strategy.dblTap(isSelector(elem) ? resolve(elem) : elem, opts);
  }

  static async tapAtPoint(
    elem: EncapsulatedElementType | Selector,
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
