import { waitFor } from 'detox';
import Utilities, { BASE_DEFAULTS } from './Utilities.ts';
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
    elementPromise: Promise<Detox.IndexableNativeElement>,
    options: TapOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      skipStabilityCheck = false,
      skipVisibilityCheck = false,
      description = 'tap element',
      elemDescription
    } = options;

    const tapWithStableCheck = async () => {
      const el = await Utilities.waitForReadyState(elementPromise, {
        timeout: 2500,
        skipStabilityCheck,
        skipVisibilityCheck
      });

      await el.tap();
      // eslint-disable-next-line no-console
      console.log(
        `✅ Successfully tapped ${elemDescription || description}`,
      );
    };

    return Utilities.executeWithRetry(tapWithStableCheck, {
      timeout,
      description: `${description}`,
      elemDescription,
    });
  }

  /**
   * Wait for an element to be visible and then tap it with enhanced options
   */
  static async waitAndTap(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    options: TapOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      skipStabilityCheck = false,
      skipVisibilityCheck = false,
      description = 'tap element',
      elemDescription
    } = options;

    const tapWithStableCheck = async () => {
      const el = await Utilities.waitForReadyState(elementPromise, {
        timeout: 2500,
        skipStabilityCheck,
        skipVisibilityCheck
      });

      await el.tap();
      // eslint-disable-next-line no-console
      console.log(
        `✅ Successfully tapped ${elemDescription || description}`,
      );
    };

    return Utilities.executeWithRetry(
      tapWithStableCheck,
      {
        timeout,
        description: 'Wait and tap element',
        elemDescription,
      },
    );
  }

  /**
   * Tap an element at specific point with stability checking
   */
  static async tapAtPoint(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    point: { x: number; y: number },
    options: TapOptions = {},
  ): Promise<void> {
    const { timeout = BASE_DEFAULTS.timeout, description = 'tap at point' } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await Utilities.waitForReadyState(elementPromise, {
          timeout: 2000,
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
    elementPromise: Promise<Detox.IndexableNativeElement>,
    options: LongPressOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      duration = 2000,
      description = 'long press',
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await Utilities.waitForReadyState(elementPromise, {
          timeout: 2000,
        });

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
    elementPromise: Promise<Detox.IndexableNativeElement>,
    text: string,
    options: TypeTextOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      clearFirst = true,
      hideKeyboard = false,
      description = `type "${text}"`,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await Utilities.waitForReadyState(elementPromise, {
          timeout: 2000,
        });

        await new Promise((resolve) => setTimeout(resolve, BASE_DEFAULTS.actionDelay));

        if (clearFirst) {
          await el.replaceText('');
        }

        const textToType = hideKeyboard ? text + '\n' : text;
        await el.typeText(textToType);

        // eslint-disable-next-line no-console
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
    elementPromise: Promise<Detox.IndexableNativeElement>,
    text: string,
    options: GestureOptions = {},
  ): Promise<void> {
    const { timeout = BASE_DEFAULTS.timeout, description = `replace with "${text}"` } =
      options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await Utilities.waitForReadyState(elementPromise, {
          timeout: 2000,
        });

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
    elementPromise: Promise<Detox.IndexableNativeElement>,
    direction: 'up' | 'down' | 'left' | 'right',
    options: SwipeOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      speed = 'fast',
      percentage = 0.75,
      description = `swipe ${direction}`,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await Utilities.waitForReadyState(elementPromise, {
          timeout: 2000,
        });

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
    targetElement: Promise<Detox.IndexableNativeElement>,
    scrollableContainer: Detox.NativeMatcher,
    options: ScrollOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      direction = 'down',
      scrollAmount = 350,
      description = 'scroll to element',
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const target = await targetElement;
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
    elementPromise: Promise<Detox.IndexableNativeElement>,
    timeout = 2000,
  ): Promise<void> {
    return this.longPress(elementPromise, { duration: timeout });
  }

  /**
   * Legacy method: Tap element at a specific index
   * @deprecated Use tap() with element.atIndex() instead for better error handling and retry mechanisms
   */
  static async tapAtIndex(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    index: number,
    timeout = 15000,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        const itemElementAtIndex = el.atIndex(index);
        await waitFor(itemElementAtIndex).toBeVisible().withTimeout(timeout);
        await itemElementAtIndex.tap();
      },
      {
        timeout,
        description: `Tap element at index ${index}`,
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
        description: `Tap text beginning with "${textPattern}"`,
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
  static async doubleTap(
    elementPromise: Promise<Detox.IndexableNativeElement>,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        await el.multiTap(2);
      },
      {
        description: 'Double tap element',
      },
    );
  }

  /**
   * Legacy method: Clear the text field
   * @deprecated Use typeText() with clearFirst option instead for better error handling and retry mechanisms
   */
  static async clearField(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    timeout = 2500,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        await waitFor(el).toBeVisible().withTimeout(timeout);
        await el.replaceText('');
      },
      {
        timeout,
        description: 'Clear field',
      },
    );
  }

  /**
   * Legacy method: Type text and hide keyboard
   * @deprecated Use typeText() with hideKeyboard option instead for better error handling and retry mechanisms
   */
  static async typeTextAndHideKeyboard(
    elementPromise: Promise<Detox.IndexableNativeElement>,
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
    elementPromise: Promise<Detox.IndexableNativeElement>,
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
    elementPromise: Promise<Detox.IndexableNativeElement>,
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
    elementPromise: Promise<Detox.IndexableNativeElement>,
    direction: Detox.Direction,
    speed?: Detox.Speed,
    percentage?: number,
    xStart?: number,
    yStart?: number,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        await el.swipe(direction, speed, percentage, xStart, yStart);
      },
      {
        description: `Swipe ${direction}`,
      },
    );
  }

  /**
   * Legacy method: Swipe at index
   * @deprecated Use swipe() with element.atIndex() instead for better error handling and retry mechanisms
   */
  static async swipeAtIndex(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    direction: Detox.Direction,
    speed?: Detox.Speed,
    percentage?: number,
    xStart?: number,
    yStart?: number,
    index = 0,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        await el
          .atIndex(index)
          .swipe(direction, speed, percentage, xStart, yStart);
      },
      {
        description: `Swipe ${direction} at index ${index}`,
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

