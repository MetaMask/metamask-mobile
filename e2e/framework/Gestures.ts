/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
import { waitFor } from 'detox';
import Utilities, { BASE_DEFAULTS } from './Utilities';
import {
  LongPressOptions,
  TapOptions,
  SwipeOptions,
  ScrollOptions,
  GestureOptions,
  TypeTextOptions,
} from './types';

/**
 * Gestures class with element stability and auto-retry
 */
export default class Gestures {
  /**
   * Tap an element with stability checking (internal method)
   * @param detoxElement - The Detox element to tap
   * @param options - Options for the tap action
   */
  private static tapWithChecks = async (
    detoxElement: DetoxElement,
    options: {
      checkStability?: boolean;
      checkVisibility?: boolean;
      checkEnabled?: boolean;
      elemDescription?: string;
    },
    point?: { x: number; y: number },
  ) => {
    const {
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
      elemDescription,
    } = options;

    if (Utilities.isWebElement(await detoxElement)) {
        // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
        await (expect(await detoxElement) as any).toExist();
        await (await detoxElement).tap();
        return;
    }

    const el = await Utilities.checkElementReadyState(detoxElement, {
      checkStability,
      checkVisibility,
      checkEnabled,
    });

    await el.tap(point);
    const successMessage = elemDescription
      ? `✅ Successfully tapped element: ${elemDescription}`
      : `✅ Successfully tapped element`;
    console.log(successMessage);
  };

  /**
   * Tap an element with stability checking and auto-retry
   */
  static async tap(
    detoxElement: DetoxElement,
    options: TapOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
      elemDescription
    } = options;

    const fn = () => this.tapWithChecks(detoxElement, {
      checkStability,
      checkVisibility,
      checkEnabled,
      elemDescription
    });
    return Utilities.executeWithRetry(fn, {
      timeout,
      description: 'tap()',
      elemDescription,
    });
  }

  /**
   * Wait for an element to be visible and then tap it with enhanced options
   * This is the same as tap() - keeping it for backwards compatibility
   */
  static async waitAndTap(
    detoxElement: DetoxElement,
    options: TapOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
      elemDescription
    } = options;

    const fn = () => this.tapWithChecks(detoxElement, {
      checkStability,
      checkVisibility,
      checkEnabled,
      elemDescription
    });
    return Utilities.executeWithRetry(fn, {
      timeout,
      description: 'waitAndTap()',
      elemDescription,
    });
  }

  /**
   * Tap an element at specific point with stability checking
   */
  static async tapAtPoint(
    detoxElement: DetoxElement,
    point: { x: number; y: number },
    options: TapOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
      elemDescription
    } = options;
    const fn = () => this.tapWithChecks(detoxElement, {
      checkStability,
      checkVisibility,
      checkEnabled,
      elemDescription
    }, point);
    return Utilities.executeWithRetry(fn, {
      timeout,
      description: 'tapAtPoint()',
      elemDescription,
    });
  }

  /**
   * Long press with stability checking
   */
  static async longPress(
    detoxElement: DetoxElement,
    options: LongPressOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkEnabled = true,
      checkVisibility = true,
      duration = 2000,
      elemDescription
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await Utilities.checkElementReadyState(
          detoxElement,
          {
            timeout,
            checkStability,
            checkEnabled,
            checkVisibility,
          },
        )) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.longPress(duration);
      },
      {
        timeout,
        description: `longPress() for ${duration}ms`,
        elemDescription,
      },
    );
  }

  /**
   * Type text with automatic field clearing and retry
   */
  static async typeText(
    detoxElement: DetoxElement,
    text: string,
    options: TypeTextOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      clearFirst = true,
      hideKeyboard = false,
      checkStability = false,
      checkEnabled = true,
      checkVisibility = true,
      sensitive = false,
      elemDescription
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await Utilities.checkElementReadyState(
          detoxElement,
          {
            timeout,
            checkStability,
            checkVisibility,
            checkEnabled,
          },
        )) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );

        if (clearFirst) {
          await el.replaceText('');
        }

        const textToType = hideKeyboard ? text + '\n' : text;
        await el.typeText(textToType);

        console.log(`✅ Successfully typed: "${sensitive ? '***' : text}" into element: ${elemDescription || 'unknown'}`);
      },
      {
        timeout,
        description: `typeText("${text}")`,
        elemDescription,
      },
    );
  }

  /**
   * Replace text in field with retry
   */
  static async replaceText(
    detoxElement: DetoxElement,
    text: string,
    options: GestureOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkEnabled = true,
      checkVisibility = true,
      elemDescription
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await Utilities.checkElementReadyState(
          detoxElement,
          {
            timeout,
            checkStability,
            checkEnabled,
            checkVisibility,
          },
        )) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.replaceText(text);
      },
      {
        timeout,
        description: `replaceText("${text}")`,
        elemDescription,
      },
    );
  }

  /**
   * Swipe with element readiness checking
   */
  static async swipe(
    detoxElement: DetoxElement,
    direction: 'up' | 'down' | 'left' | 'right',
    options: SwipeOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      speed = 'fast',
      percentage = 0.75,
      checkStability = false,
      checkEnabled = true,
      checkVisibility = true,
      elemDescription
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await Utilities.checkElementReadyState(
          detoxElement,
          {
            timeout,
            checkStability,
            checkEnabled,
            checkVisibility,
          },
        )) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.swipe(direction, speed, percentage);
      },
      {
        timeout,
        description: `swipe(${direction})`,
        elemDescription,
      },
    );
  }

  /**
   * Scroll to element with dynamic retry
   */
  static async scrollToElement(
    targetElement: DetoxElement,
    scrollableContainer: Promise<Detox.NativeMatcher>,
    options: ScrollOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      direction = 'down',
      scrollAmount = 350,
      elemDescription,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const target = (await targetElement) as Detox.IndexableNativeElement;
        const scrollable = (await scrollableContainer); // This is only working when it's awaited
        await waitFor(target)
          .toBeVisible()
          .whileElement(scrollable)
          .scroll(scrollAmount, direction);
      },
      {
        timeout,
        description: `scrollToElement(${direction})`,
        elemDescription,
      },
    );
  }

  // Legacy methods for backwards compatibility

  /**
   * Legacy method: Tap and long press
   * @deprecated Use longPress() instead for better error handling and retry mechanisms
   */
  static async tapAndLongPress(
    detoxElement: DetoxElement,
    timeout = 2000,
  ): Promise<void> {
    return this.longPress(detoxElement, { duration: timeout });
  }

  /**
   * Legacy method: Tap element at a specific index
   * @deprecated Use tap() with element.atIndex() instead for better error handling and retry mechanisms
   */
  static async tapAtIndex(
    detoxElement: DetoxElement,
    index: number,
    timeout = 15000,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await detoxElement) as Detox.IndexableNativeElement;
        const itemElementAtIndex = el.atIndex(index);
        await waitFor(itemElementAtIndex).toBeVisible().withTimeout(timeout);
        await itemElementAtIndex.tap();
      },
      {
        timeout,
        description: `Tapped element at index ${index}`,
      },
    );
  }

  /**
   * Legacy method: Tap web element
   * @deprecated Use tap() with web elements instead for better error handling and retry mechanisms
   */
  static async tapWebElement(
    detoxElement: Promise<Detox.IndexableWebElement>,
    timeout = 15000,
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, jest/valid-expect
        await (expect(await detoxElement) as any).toExist();
        await (await detoxElement).tap();
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Web element not found or not tappable');
  }

  /**
   * Legacy method: Double tap an element
   * @deprecated Use tap() with multiTap(2) instead for better error handling and retry mechanisms
   */
  static async doubleTap(detoxElement: DetoxElement): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await detoxElement) as Detox.IndexableNativeElement;
        await el.multiTap(2);
      },
      {
        description: 'Double tapped element',
      },
    );
  }

  /**
   * Legacy method: Clear the text field
   * @deprecated Use typeText() with clearFirst option instead for better error handling and retry mechanisms
   */
  static async clearField(
    detoxElement: DetoxElement,
    timeout = 2500,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await detoxElement) as Detox.IndexableNativeElement;
        await waitFor(el).toBeVisible().withTimeout(timeout);
        await el.replaceText('');
      },
      {
        timeout,
        description: 'Cleared field',
      },
    );
  }

  /**
   * Legacy method: Type text and hide keyboard
   * @deprecated Use typeText() with hideKeyboard option instead for better error handling and retry mechanisms
   */
  static async typeTextAndHideKeyboard(
    detoxElement: DetoxElement,
    text: string,
  ): Promise<void> {
    return this.typeText(detoxElement, text, {
      clearFirst: true,
      hideKeyboard: true,
    });
  }

  /**
   * Legacy method: Type text without hiding keyboard
   * @deprecated Use typeText() with hideKeyboard: false option instead for better error handling and retry mechanisms
   */
  static async typeTextWithoutKeyboard(
    detoxElement: DetoxElement,
    text: string,
  ): Promise<void> {
    return this.typeText(detoxElement, text, {
      clearFirst: false,
      hideKeyboard: false,
    });
  }

  /**
   * Legacy method: Replace text in field
   * @deprecated Use replaceText() instead for better error handling and retry mechanisms
   */
  static async replaceTextInField(
    detoxElement: DetoxElement,
    text: string,
    timeout = 10000,
  ): Promise<void> {
    return this.replaceText(detoxElement, text, { timeout });
  }

  static async scrollToWebViewPort(
    detoxElement: WebElement,
  ): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        await (await detoxElement).scrollToView();
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'scrollToWebViewPort()',
      }
    );
  }
}
