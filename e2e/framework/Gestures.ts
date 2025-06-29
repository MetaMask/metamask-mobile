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
   * Tap an element with stability checking and auto-retry
   */
  static async tap(
    elementPromise: DetoxElement,
    options: TapOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      skipVisibilityCheck = false,
      description = 'tapped element',
      elemDescription,
    } = options;

    const tapWithStableCheck = async () => {
      const el = await Utilities.checkElementReadyState(elementPromise, {
        checkStability,
        skipVisibilityCheck,
      });

      await el.tap();
      const successMessage = elemDescription
        ? `✅ Successfully tapped element: ${elemDescription}`
        : `✅ Successfully ${description}`;
      console.log(successMessage);
    };

    return Utilities.executeWithRetry(tapWithStableCheck, {
      timeout,
      description: `${description}`,
      elemDescription,
    });
  }

  /**
   * Wait for an element to be visible and then tap it with enhanced options
   * This is the same as tap() - keeping it for backwards compatibility
   */
  static async waitAndTap(
    elementPromise: DetoxElement,
    options: TapOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      skipVisibilityCheck = false,
      description = 'waited and tapped element',
      elemDescription,
    } = options;

    const tapWithStableCheck = async () => {
      const el = await Utilities.checkElementReadyState(elementPromise, {
        checkStability,
        skipVisibilityCheck,
      });

      await el.tap();
      const successMessage = elemDescription
        ? `✅ Successfully tapped element: ${elemDescription}`
        : `✅ Successfully ${description}`;
      console.log(successMessage);
    };

    return Utilities.executeWithRetry(tapWithStableCheck, {
      timeout,
      description,
      elemDescription,
    });
  }

  /**
   * Tap an element at specific point with stability checking
   */
  static async tapAtPoint(
    elementPromise: DetoxElement,
    point: { x: number; y: number },
    options: TapOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = 'tapped at point',
      checkStability,
      skipVisibilityCheck,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await Utilities.checkElementReadyState(elementPromise, {
          checkStability,
          skipVisibilityCheck,
        });

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.tap(point);
      },
      {
        timeout,
        description: `Tap at point: ${description}`,
      },
    );
  }

  /**
   * Long press with stability checking
   */
  static async longPress(
    elementPromise: DetoxElement,
    options: LongPressOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      duration = 2000,
      description = 'long pressed element',
      checkStability,
      skipVisibilityCheck,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await Utilities.checkElementReadyState(elementPromise, {
          checkStability,
          skipVisibilityCheck,
        }) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.longPress(duration);
      },
      {
        timeout,
        description: `Long press: ${description}`,
      },
    );
  }

  /**
   * Type text with automatic field clearing and retry
   */
  static async typeText(
    elementPromise: DetoxElement,
    text: string,
    options: TypeTextOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      clearFirst = true,
      hideKeyboard = false,
      description = `typed "${text}"`,
      checkStability,
      skipVisibilityCheck,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await Utilities.checkElementReadyState(elementPromise, {
          checkStability,
          skipVisibilityCheck,
        }) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );

        if (clearFirst) {
          await el.replaceText('');
        }

        const textToType = hideKeyboard ? text + '\n' : text;
        await el.typeText(textToType);

        console.log(`✅ Successfully typed: "${text}"`);
      },
      {
        timeout,
        description: `Type text: ${description}`,
      },
    );
  }

  /**
   * Replace text in field with retry
   */
  static async replaceText(
    elementPromise: DetoxElement,
    text: string,
    options: GestureOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = `replaced with "${text}"`,
      checkStability,
      skipVisibilityCheck,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await Utilities.checkElementReadyState(elementPromise, {
          checkStability,
          skipVisibilityCheck,
        }) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.replaceText(text);
      },
      {
        timeout,
        description: `Replace text: ${description}`,
      },
    );
  }

  /**
   * Swipe with element readiness checking
   */
  static async swipe(
    elementPromise: DetoxElement,
    direction: 'up' | 'down' | 'left' | 'right',
    options: SwipeOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      speed = 'fast',
      percentage = 0.75,
      description = `swiped ${direction}`,
      checkStability,
      skipVisibilityCheck,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await Utilities.checkElementReadyState(elementPromise, {
          checkStability,
          skipVisibilityCheck,
        }) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.swipe(direction, speed, percentage);
      },
      {
        timeout,
        description: `Swipe: ${description}`,
      },
    );
  }

  /**
   * Scroll to element with dynamic retry
   */
  static async scrollToElement(
    targetElement: DetoxElement,
    scrollableContainer: Detox.NativeMatcher,
    options: ScrollOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      direction = 'down',
      scrollAmount = 350,
      description = 'scrolled to element',
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const target = (await targetElement) as Detox.IndexableNativeElement;
        await waitFor(target)
          .toBeVisible()
          .whileElement(scrollableContainer)
          .scroll(scrollAmount, direction);
      },
      {
        timeout,
        description: `Scroll: ${description}`,
      },
    );
  }

  // Legacy methods for backwards compatibility

  /**
   * Legacy method: Tap and long press
   * @deprecated Use longPress() instead for better error handling and retry mechanisms
   */
  static async tapAndLongPress(
    elementPromise: DetoxElement,
    timeout = 2000,
  ): Promise<void> {
    return this.longPress(elementPromise, { duration: timeout });
  }

  /**
   * Legacy method: Tap element at a specific index
   * @deprecated Use tap() with element.atIndex() instead for better error handling and retry mechanisms
   */
  static async tapAtIndex(
    elementPromise: DetoxElement,
    index: number,
    timeout = 15000,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await elementPromise) as Detox.IndexableNativeElement;
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
   * Legacy method: Tap element with text partial text matching
   * @deprecated Use tap() with proper element matching instead for better error handling and retry mechanisms
   */
  static async tapTextBeginingWith(textPattern: string): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        await element(by.text(new RegExp(`^/${textPattern} .*$/`))).tap();
      },
      {
        description: `Tapped text beginning with "${textPattern}"`,
      },
    );
  }

  /**
   * Legacy method: Tap web element
   * @deprecated Use tap() with web elements instead for better error handling and retry mechanisms
   */
  static async tapWebElement(
    elementPromise: Promise<Detox.IndexableWebElement>,
    timeout = 15000,
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, jest/valid-expect
        await (expect(await elementPromise) as any).toExist();
        await (await elementPromise).tap();
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Web element not found or not tappable');
  }

  /**
   * Legacy method: Type text into a web element
   * @deprecated Use typeText() with web elements instead for better error handling and retry mechanisms
   */
  static async typeInWebElement(
    elementPromise: Promise<Detox.IndexableWebElement>,
    text: string,
  ): Promise<void> {
    try {
      const webElement = await elementPromise;
      await webElement.runScript(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (el: any, value: string) => {
          el.focus();
          el.value = value;
          if (el._valueTracker) el._valueTracker.setValue('');
          el.dispatchEvent(new Event('input', { bubbles: true }));
        },
        [text],
      );
    } catch {
      // Fallback to basic replaceText if runScript fails
      const webElement = await elementPromise;
      await webElement.replaceText(text);
    }
  }

  /**
   * Legacy method: Double tap an element
   * @deprecated Use tap() with multiTap(2) instead for better error handling and retry mechanisms
   */
  static async doubleTap(elementPromise: DetoxElement): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await elementPromise) as Detox.IndexableNativeElement;
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
    elementPromise: DetoxElement,
    timeout = 2500,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await elementPromise) as Detox.IndexableNativeElement;
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
    elementPromise: DetoxElement,
    text: string,
  ): Promise<void> {
    return this.typeText(elementPromise, text, {
      clearFirst: true,
      hideKeyboard: true,
    });
  }

  /**
   * Legacy method: Type text without hiding keyboard
   * @deprecated Use typeText() with hideKeyboard: false option instead for better error handling and retry mechanisms
   */
  static async typeTextWithoutKeyboard(
    elementPromise: DetoxElement,
    text: string,
  ): Promise<void> {
    return this.typeText(elementPromise, text, {
      clearFirst: false,
      hideKeyboard: false,
    });
  }

  /**
   * Legacy method: Replace text in field
   * @deprecated Use replaceText() instead for better error handling and retry mechanisms
   */
  static async replaceTextInField(
    elementPromise: DetoxElement,
    text: string,
    timeout = 10000,
  ): Promise<void> {
    return this.replaceText(elementPromise, text, { timeout });
  }

  /**
   * Legacy method: Swipe with detailed parameters
   * @deprecated Use swipe() instead for better error handling and retry mechanisms
   */
  static async swipeDetailed(
    elementPromise: DetoxElement,
    direction: Detox.Direction,
    speed?: Detox.Speed,
    percentage?: number,
    xStart?: number,
    yStart?: number,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await elementPromise) as Detox.IndexableNativeElement;
        await el.swipe(direction, speed, percentage, xStart, yStart);
      },
      {
        description: `Swiped ${direction}`,
      },
    );
  }

  /**
   * Legacy method: Swipe at index
   * @deprecated Use swipe() with element.atIndex() instead for better error handling and retry mechanisms
   */
  static async swipeAtIndex(
    elementPromise: DetoxElement,
    direction: Detox.Direction,
    speed?: Detox.Speed,
    percentage?: number,
    xStart?: number,
    yStart?: number,
    index = 0,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await elementPromise) as Detox.IndexableNativeElement;
        await el
          .atIndex(index)
          .swipe(direction, speed, percentage, xStart, yStart);
      },
      {
        description: `Swiped ${direction} at index ${index}`,
      },
    );
  }

  /**
   * Legacy method: Scroll to web view port
   * @deprecated Use scrollToElement() instead for better error handling and retry mechanisms
   */
  static async scrollToWebViewPort(
    elementPromise: Promise<Detox.IndexableWebElement>,
  ): Promise<void> {
    await (await elementPromise).scrollToView();
  }
}
