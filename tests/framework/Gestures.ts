/* eslint-disable no-restricted-syntax */
import { waitFor } from 'detox';
import Utilities, { BASE_DEFAULTS } from './Utilities.ts';
import {
  LongPressOptions,
  TapOptions,
  SwipeOptions,
  ScrollOptions,
  GestureOptions,
  TypeTextOptions,
  type ScrollContainer,
} from './types.ts';
import { createLogger } from './logger.ts';
import { sleep } from '../../app/util/testUtils';
import { type EncapsulatedElementType } from './EncapsulatedElement.ts';
import { FrameworkDetector } from './FrameworkDetector.ts';
import UnifiedGestures from './UnifiedGestures.ts';
import { PlaywrightElement } from './PlaywrightAdapter.ts';

const logger = createLogger({ name: 'Gestures' });

/**
 * Gestures class with element stability and auto-retry
 */
export default class Gestures {
  /**
   * Tap an element with stability checking (internal method)
   * @param elem - The Detox or Web element to tap
   * @param options - Options for the tap action
   */
  private static tapWithChecks = async (
    elem: DetoxElement | WebElement | EncapsulatedElementType,
    options: {
      checkStability?: boolean;
      checkVisibility?: boolean;
      checkEnabled?: boolean;
      elemDescription?: string;
      delay?: number;
      waitForElementToDisappear?: boolean;
    },
    point?: { x: number; y: number },
  ) => {
    const {
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
      elemDescription,
    } = options;

    if (Utilities.isWebElement(await elem)) {
      // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
      await (expect(await elem) as any).toExist();
      await (await elem).tap();
      if (options.waitForElementToDisappear) {
        await Utilities.waitForElementToDisappear(elem);
      }
      return;
    }

    const el = await Utilities.checkElementReadyState(elem, {
      checkStability,
      checkVisibility,
      checkEnabled,
    });

    if (options.delay) {
      await new Promise((resolve) => setTimeout(resolve, options.delay));
    } else {
      await new Promise((resolve) =>
        setTimeout(resolve, BASE_DEFAULTS.actionDelay),
      );
    }
    await el.tap(point);

    if (options.waitForElementToDisappear) {
      await Utilities.waitForElementToDisappear(elem);
    }

    const successMessage = elemDescription
      ? `✅ Successfully tapped element: ${elemDescription}`
      : `✅ Successfully tapped element`;
    logger.debug(successMessage);
  };

  /**
   * Tap an element with stability checking and auto-retry
   * @returns A Promise that resolves when the tap is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWith
   */
  static async tap(
    elem: DetoxElement | WebElement | EncapsulatedElementType,
    options: TapOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      return UnifiedGestures.tap(elem as EncapsulatedElementType, {
        timeout: options.timeout,
        description: options.elemDescription,
        delay: options.delay,
      });
    }

    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
      elemDescription,
      waitForElementToDisappear = false,
      delay = 500,
    } = options;

    const fn = () =>
      this.tapWithChecks(elem, {
        checkStability,
        checkVisibility,
        checkEnabled,
        elemDescription,
        waitForElementToDisappear,
        delay,
      });
    return Utilities.executeWithRetry(fn, {
      timeout,
      description: 'tap()',
      elemDescription,
    });
  }

  /**
   * Wait for an element to be visible and then tap it with enhanced options
   * This is the same as tap() - but with an additional delay before the tap.
   * This is useful for cases where the element might not be immediately ready for interaction.
   * @returns A Promise that resolves when the tap is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWith
   */
  static async waitAndTap(
    elem: DetoxElement | WebElement | EncapsulatedElementType,
    options: TapOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      return UnifiedGestures.waitAndTap(elem as EncapsulatedElementType, {
        timeout: options.timeout,
        description: options.elemDescription,
        delay: options.delay,
      });
    }

    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
      elemDescription,
      delay = 500,
      waitForElementToDisappear = false,
    } = options;

    const fn = async () =>
      await this.tapWithChecks(elem, {
        checkStability,
        checkVisibility,
        checkEnabled,
        elemDescription,
        delay,
        waitForElementToDisappear,
      });

    return Utilities.executeWithRetry(fn, {
      timeout,
      description: 'waitAndTap()',
      elemDescription,
    });
  }

  /**
   * Tap element at a specific index
   * @returns A Promise that resolves when the tap is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWithRetry
   */
  static async tapAtIndex(
    elem: DetoxElement | EncapsulatedElementType,
    index: number,
    options: TapOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      return UnifiedGestures.tapAtIndex(
        elem as EncapsulatedElementType,
        index,
        {
          timeout: options.timeout,
          description: options.elemDescription,
        },
      );
    }

    const {
      timeout = BASE_DEFAULTS.timeout,
      elemDescription,
      delay = 0,
    } = options;

    // Add delay before tapping if provided
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Use a shorter inner timeout to allow for retries within the overall timeout
    // If inner timeout equals outer timeout, no retries can happen
    const innerTimeout = Math.min(3000, timeout / 3);

    return Utilities.executeWithRetry(
      async () => {
        const el = (await elem) as Detox.IndexableNativeElement;
        const itemElementAtIndex = el.atIndex(index);
        await waitFor(itemElementAtIndex)
          .toBeVisible()
          .withTimeout(innerTimeout);
        await itemElementAtIndex.tap();
        const successMessage = elemDescription
          ? `✅ Successfully tapped element at index: ${index} ${elemDescription}`
          : `✅ Successfully tapped element at index: ${index}`;
        logger.debug(successMessage);
      },
      {
        timeout,
        description: `tapAtIndex(${index})`,
        elemDescription,
      },
    );
  }

  /**
   * Tap an element at specific point with stability checking
   * This method is specifically designed for detox elements and should not be used with web elements.
   * @returns A Promise that resolves when the tap is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWithRetry
   */
  static async tapAtPoint(
    elem: DetoxElement | EncapsulatedElementType,
    point: { x: number; y: number },
    options: TapOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      return UnifiedGestures.tapAtPoint(
        elem as EncapsulatedElementType,
        point,
        {
          timeout: options.timeout,
          description: options.elemDescription,
        },
      );
    }

    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
      elemDescription,
    } = options;
    const fn = () =>
      this.tapWithChecks(
        elem,
        {
          checkStability,
          checkVisibility,
          checkEnabled,
          elemDescription,
        },
        point,
      );

    return Utilities.executeWithRetry(fn, {
      timeout,
      description: 'tapAtPoint()',
      elemDescription,
    });
  }

  /**
   * Performs a double tap gesture on a native mobile element.
   * This method is specifically designed for mobile automation testing and should not be used with web elements.
   * @returns A Promise that resolves when the double tap gesture is completed
   * @throws Will retry the operation if it fails, with retry logic handled by executeWithRetry
   */
  static async dblTap(
    elem: DetoxElement | EncapsulatedElementType,
    options: TapOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      return UnifiedGestures.dblTap(elem as EncapsulatedElementType, {
        timeout: options.timeout,
        description: options.elemDescription,
      });
    }

    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkVisibility = true,
      checkEnabled = true,
      elemDescription,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await Utilities.checkElementReadyState(elem, {
          timeout,
          checkStability,
          checkVisibility,
          checkEnabled,
        })) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.multiTap(2);
      },
      {
        timeout,
        description: 'dblTap()',
        elemDescription,
      },
    );
  }

  /**
   * Long press with stability checking
   * @returns A Promise that resolves when the long press is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWithRetry
   */
  static async longPress(
    elem: DetoxElement | EncapsulatedElementType,
    options: LongPressOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      return UnifiedGestures.longPress(elem as EncapsulatedElementType, {
        timeout: options.timeout,
        description: options.elemDescription,
        duration: options.duration,
      });
    }

    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkEnabled = true,
      checkVisibility = true,
      duration = 2000,
      elemDescription,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await Utilities.checkElementReadyState(elem, {
          timeout,
          checkStability,
          checkEnabled,
          checkVisibility,
        })) as Detox.IndexableNativeElement;

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
   * @returns A Promise that resolves when the text is successfully typed
   * @throws Will retry the operation if it fails, with retry logic handled by executeWith
   */
  static async typeText(
    elem: DetoxElement | EncapsulatedElementType,
    text: string,
    options: TypeTextOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      return UnifiedGestures.typeText(elem as EncapsulatedElementType, text, {
        timeout: options.timeout,
        description: options.elemDescription,
        hideKeyboard: options.hideKeyboard,
        clearFirst: options.clearFirst,
      });
    }

    const {
      timeout = BASE_DEFAULTS.timeout,
      clearFirst = true,
      hideKeyboard = false,
      checkStability = false,
      checkEnabled = true,
      checkVisibility = true,
      sensitive = false,
      delay = BASE_DEFAULTS.actionDelay,
      elemDescription,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await Utilities.checkElementReadyState(elem, {
          timeout,
          checkStability,
          checkVisibility,
          checkEnabled,
        })) as Detox.IndexableNativeElement;

        await new Promise((resolve) => setTimeout(resolve, delay));

        if (clearFirst) {
          await el.replaceText('');
        }

        const textToType = hideKeyboard ? text + '\n' : text;
        await el.typeText(textToType);
        await sleep(500); // To help reduce flakiness as sometimes the app is not registering all text input

        // small delay to prevent the app not registering text input
        // the action is too fast
        await sleep(500);

        logger.debug(
          `✅ Successfully typed: "${sensitive ? '***' : text}" into element: ${
            elemDescription || 'unknown'
          }`,
        );
      },
      {
        timeout,
        description: `typeText("${text}")`,
        elemDescription,
      },
    );
  }

  /**
   * Type text into a web element within a webview.
   * Detox uses JS injection; Appium uses Playwright clear + fill on the web element.
   * @param {Promise<Detox.IndexableWebElement> | Promise<{ clear: () => Promise<void>; fill: (text: string) => Promise<void> }>} element
   * @param {string} text - The text to type.
   */
  static async typeInWebElement(
    elem:
      | Promise<IndexableWebElement>
      | Promise<{
          clear: () => Promise<void>;
          fill: (text: string) => Promise<void>;
        }>,
    text: string,
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      const input = await elem;
      await input.clear();
      await input.fill(text);
      return;
    }

    try {
      await (
        await (elem as Promise<IndexableWebElement>)
      ).runScript(
        (
          el: {
            focus: () => void;
            value: string;
            _valueTracker?: { setValue: (v: string) => void };
            dispatchEvent: (event: { bubbles?: boolean }) => void;
          },
          value: string,
        ) => {
          el.focus();
          el.value = value;
          el._valueTracker && el._valueTracker.setValue('');
          el.dispatchEvent(new Event('input', { bubbles: true }));
        },
        [text],
      );
    } catch {
      await this.typeText(elem as Promise<IndexableWebElement>, text);
    }
  }

  /**
   * Replace text in field with retry
   * @returns A Promise that resolves when the text is successfully replaced
   * @throws Will retry the operation if it fails, with retry logic handled by executeWithRetry
   */
  static async replaceText(
    elem: DetoxElement | EncapsulatedElementType,
    text: string,
    options: GestureOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      return UnifiedGestures.replaceText(
        elem as EncapsulatedElementType,
        text,
        {
          timeout: options.timeout,
          description: options.elemDescription,
        },
      );
    }

    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkEnabled = true,
      checkVisibility = true,
      elemDescription,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await Utilities.checkElementReadyState(elem, {
          timeout,
          checkStability,
          checkEnabled,
          checkVisibility,
        })) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.replaceText(text);
        await sleep(500); // To help reduce flakiness as sometimes the app is not registering all text input
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
   * @returns A Promise that resolves when the swipe is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWith
   */
  static async swipe(
    elem: DetoxElement | EncapsulatedElementType,
    direction: 'up' | 'down' | 'left' | 'right',
    options: SwipeOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      return UnifiedGestures.swipe(elem as EncapsulatedElementType, direction, {
        timeout: options.timeout,
        description: options.elemDescription,
        speed: options.speed,
        percentage: options.percentage,
      });
    }

    const {
      timeout = BASE_DEFAULTS.timeout,
      speed = 'fast',
      percentage = 0.75,
      checkStability = false,
      checkEnabled = true,
      checkVisibility = true,
      elemDescription,
      startOffsetPercentage = { x: NaN, y: NaN },
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await Utilities.checkElementReadyState(elem, {
          timeout,
          checkStability,
          checkEnabled,
          checkVisibility,
        })) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.swipe(
          direction,
          speed,
          percentage,
          startOffsetPercentage.x,
          startOffsetPercentage.y,
        );
      },
      {
        timeout,
        description: `swipe(${direction})`,
        elemDescription,
      },
    );
  }
  /**
   * Scroll to element with dynamic retry and platform-specific adjustments
   * @returns A Promise that resolves when the scroll is successful
   * @throws Will retry the operation if it fails, with retry logic handled by executeWith
   */
  static async scrollToElement(
    targetElement: DetoxElement | EncapsulatedElementType,
    scrollableContainer?: ScrollContainer,
    options: ScrollOptions = {},
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      return UnifiedGestures.scrollToElement(
        targetElement as EncapsulatedElementType,
        scrollableContainer,
        {
          timeout: options.timeout,
          description: options.elemDescription,
          direction: options.direction,
          scrollAmount: options.scrollAmount,
        },
      );
    }

    const {
      timeout = BASE_DEFAULTS.timeout,
      direction = 'down',
      scrollAmount = 350,
      elemDescription,
      delay = 0,
      startPositionX = NaN,
      startPositionY = NaN,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        // Add delay before scrolling
        await new Promise((resolve) => setTimeout(resolve, delay));

        const target = (await targetElement) as Detox.IndexableNativeElement;
        const scrollable =
          typeof scrollableContainer === 'string'
            ? by.id(scrollableContainer)
            : await scrollableContainer;

        if (!scrollable) {
          throw new Error(
            'Gestures.scrollToElement requires a scroll container matcher on Detox.',
          );
        }

        if (device.getPlatform() === 'android') {
          const scrollableElement = element(scrollable);
          try {
            await waitFor(target).toBeVisible().withTimeout(100);
            return;
          } catch {
            await scrollableElement.scroll(
              scrollAmount,
              direction,
              startPositionX,
              startPositionY,
            );
            await waitFor(target).toBeVisible().withTimeout(100);
          }
        } else {
          await waitFor(target)
            .toBeVisible()
            .whileElement(scrollable)
            .scroll(scrollAmount, direction, startPositionX, startPositionY);
        }
      },
      {
        timeout,
        description: `scrollToElement(${direction})`,
        elemDescription,
      },
    );
  }

  /**
   * Scrolls a web element into the viewport with retry logic.
   * @returns A Promise that resolves when the element has been successfully scrolled into view
   * @throws Will throw an error if the scroll operation fails after all retry attempts
   */
  static async scrollToWebViewPort(
    elem: WebElement | Promise<PlaywrightElement>,
  ): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      const el = await elem;
      if (el instanceof PlaywrightElement) {
        await Utilities.executeWithRetry(
          async () => {
            await el.scrollToView();
          },
          {
            timeout: BASE_DEFAULTS.timeout,
            description: 'scrollToWebViewPort()',
          },
        );
        return;
      }
    }

    await Utilities.executeWithRetry(
      async () => {
        await (await elem).scrollToView();
      },
      {
        timeout: BASE_DEFAULTS.timeout,
        description: 'scrollToWebViewPort()',
      },
    );
  }

  // Legacy methods for backwards compatibility

  /**
   * Legacy method: Tap and long press
   * @deprecated Use longPress() instead for better error handling and retry mechanisms
   */
  static async tapAndLongPress(
    elem: DetoxElement | EncapsulatedElementType,
    timeout = 2000,
  ): Promise<void> {
    return this.longPress(elem, { duration: timeout });
  }

  /**
   * Legacy method: Tap web element
   * @deprecated Use tap() with web elements instead for better error handling and retry mechanisms
   */
  static async tapWebElement(
    elem: Promise<Detox.IndexableWebElement>,
    timeout = 15000,
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, jest/valid-expect
        await (expect(await elem) as any).toExist();
        await (await elem).tap();
        return;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Web element not found or not tappable');
  }

  /**
   * Legacy method: Double tap an element
   * @deprecated Use dblTap() instead for better error handling and retry mechanisms - we should replace the function name when we have migrated all usages
   */
  static async doubleTap(
    elem: DetoxElement | EncapsulatedElementType,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await elem) as Detox.IndexableNativeElement;
        await el.multiTap(2);
      },
      {
        description: 'Double tapped element',
      },
    );
  }

  /**
   * Legacy method: Clear the text field
   * @deprecated Use typeText() with clearFirst option or the replaceText() from Gestures.ts instead for better error handling and retry mechanisms
   */
  static async clearField(
    elem: DetoxElement | EncapsulatedElementType,
    options: GestureOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      checkStability = false,
      checkEnabled = true,
      checkVisibility = true,
      elemDescription,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await Utilities.checkElementReadyState(elem, {
          timeout,
          checkStability,
          checkVisibility,
          checkEnabled,
        })) as Detox.IndexableNativeElement;

        await new Promise((resolve) =>
          setTimeout(resolve, BASE_DEFAULTS.actionDelay),
        );
        await el.replaceText('');
      },
      {
        timeout,
        description: 'clearField()',
        elemDescription,
      },
    );
  }

  /**
   * Legacy method: Type text and hide keyboard
   * @deprecated Use typeText() with hideKeyboard option instead for better error handling and retry mechanisms
   */
  static async typeTextAndHideKeyboard(
    elem: DetoxElement | EncapsulatedElementType,
    text: string,
  ): Promise<void> {
    return this.typeText(elem, text, {
      clearFirst: true,
      hideKeyboard: true,
    });
  }

  /**
   * Legacy method: Type text without hiding keyboard
   * @deprecated Use typeText() with hideKeyboard: false option instead for better error handling and retry mechanisms
   */
  static async typeTextWithoutKeyboard(
    elem: DetoxElement | EncapsulatedElementType,
    text: string,
  ): Promise<void> {
    return this.typeText(elem, text, {
      clearFirst: false,
      hideKeyboard: false,
    });
  }

  /**
   * Legacy method: Replace text in field
   * @deprecated Use replaceText() instead for better error handling and retry mechanisms
   */
  static async replaceTextInField(
    elem: DetoxElement | EncapsulatedElementType,
    text: string,
    timeout = 10000,
  ): Promise<void> {
    return this.replaceText(elem, text, { timeout });
  }
}
