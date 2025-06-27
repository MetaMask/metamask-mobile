import { waitFor } from 'detox';
import Utilities, { BASE_DEFAULTS } from './Utilities.ts';
import { AssertionOptions } from './types.ts';


/**
 * Assertions with auto-retry and better error messages
 */
export default class Assertions {
  /**
   * Assert element is visible with auto-retry
   */
  static async expectVisible(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = BASE_DEFAULTS.timeout, description = 'element visibility' } =
      options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        if (device.getPlatform() === 'ios') {
          await waitFor(el).toExist().withTimeout(1000);
        } else {
          await waitFor(el).toBeVisible().withTimeout(1000);
        }
      },
      {
        timeout,
        description: `Assert ${description}`,
      },
    );
  }

  /**
   * Assert element is not visible with auto-retry
   */
  static async expectNotVisible(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = BASE_DEFAULTS.timeout, description = 'element not visible' } =
      options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        await waitFor(el).not.toBeVisible().withTimeout(1000);
      },
      {
        timeout,
        description: `Assert ${description}`,
      },
    );
  }

  /**
   * Assert element has specific text with auto-retry
   */
  static async expectText(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = `element has text "${text}"`,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        await waitFor(el).toHaveText(text).withTimeout(1000);
      },
      {
        timeout,
        description: `Assert ${description}`,
      },
    );
  }

  /**
   * Assert element has specific label with auto-retry
   */
  static async expectLabel(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    label: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = `element has label "${label}"`,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        await waitFor(el).toHaveLabel(label).withTimeout(1000);
      },
      {
        timeout,
        description: `Assert ${description}`,
      },
    );
  }

  /**
   * Assert text is displayed anywhere on screen with auto-retry
   */
  static async expectTextDisplayed(
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = BASE_DEFAULTS.timeout } = options;

    return Utilities.executeWithRetry(
      async () => {
        const textElement = element(by.text(text));
        if (device.getPlatform() === 'ios') {
          await waitFor(textElement).toExist().withTimeout(1000);
        } else {
          await waitFor(textElement).toBeVisible().withTimeout(1000);
        }
      },
      {
        timeout,
        description: `Assert text "${text}" is displayed`,
      },
    );
  }

  /**
   * Assert toggle state with auto-retry
   */
  static async expectToggleState(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    expectedState: boolean,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = BASE_DEFAULTS.timeout } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        // Check toggle state - this may need adjustment based on your app's toggle implementation
        const attributes = await el.getAttributes();
        const isToggled =
          ('text' in attributes && attributes.text === 'true') ||
          ('label' in attributes && attributes.label === 'true') ||
          ('value' in attributes && attributes.value === 'true');
        if (isToggled !== expectedState) {
          throw new Error(`Toggle state expected: ${expectedState}, actual: ${isToggled}`);
        }
      },
      {
        timeout,
        description: `Assert toggle is ${expectedState ? 'on' : 'off'}`,
      },
    );
  }

  /**
   * Legacy method: Check if an element is visible (backwards compatibility)
   * @deprecated Use expectVisible() instead for better error handling and retry mechanisms
   */
  static async checkIfVisible(
    elementPromise: Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement | Detox.NativeElement>,
    timeout = 15000,
  ): Promise<void> {
    return this.expectVisible(elementPromise as Promise<Detox.IndexableNativeElement>, { timeout });
  }

  /**
   * Legacy method: Check if a web element exists
   * @deprecated Use expectVisible() instead for better error handling and retry mechanisms
   */
  static async webViewElementExists(
    elementPromise: Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement | Detox.NativeElement>,
  ): Promise<void> {
    // For web elements, just use the basic expect assertion
    const el = await elementPromise;
    // Use Detox's expect which has toExist method
    // Use Detox's expect syntax for element existence
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, jest/valid-expect
    await (expect(el) as any).toExist();
  }

  /**
   * Legacy method: Check if an element is not visible
   * @deprecated Use expectNotVisible() instead for better error handling and retry mechanisms
   */
  static async checkIfNotVisible(
    elementPromise: Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement | Detox.NativeElement>,
    timeout = 15000,
  ): Promise<void> {
    return this.expectNotVisible(elementPromise as Promise<Detox.IndexableNativeElement>, { timeout });
  }

  /**
   * Legacy method: Check if an element has specific text
   * @deprecated Use expectText() instead for better error handling and retry mechanisms
   */
  static async checkIfElementToHaveText(
    elementPromise: Promise<Detox.IndexableNativeElement | Detox.IndexableSystemElement | Detox.NativeElement>,
    text: string,
    timeout = 15000,
  ): Promise<void> {
    return this.expectText(elementPromise as Promise<Detox.IndexableNativeElement>, text, { timeout });
  }

  /**
   * Legacy method: Check if an element has specific label
   * @deprecated Use expectLabel() instead for better error handling and retry mechanisms
   */
  static async checkIfElementHasLabel(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    label: string,
    timeout = 15000,
  ): Promise<void> {
    return this.expectLabel(elementPromise, label, { timeout });
  }

  /**
   * Legacy method: Check if text is displayed anywhere on screen
   * @deprecated Use expectTextDisplayed() instead for better error handling and retry mechanisms
   */
  static async checkIfTextIsDisplayed(text: string, timeout = 15000): Promise<void> {
    return this.expectTextDisplayed(text, { timeout });
  }

  /**
   * Legacy method: Check if text is not displayed
   * @deprecated Use expectNotVisible() or custom assertion instead for better error handling and retry mechanisms
   */
  static async checkIfTextIsNotDisplayed(text: string, timeout = 15000): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const textElement = element(by.text(text));
        await waitFor(textElement).not.toBeVisible().withTimeout(1000);
      },
      {
        timeout,
        description: `Text "${text}" is not displayed`,
      },
    );
  }

  /**
   * Legacy method: Check if an element does not have specific text
   * @deprecated Use expectNotVisible() or custom assertion instead for better error handling and retry mechanisms
   */
  static async checkIfElementNotToHaveText(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    text: string,
    timeout = 15000,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        await waitFor(el).not.toHaveText(text).withTimeout(1000);
      },
      {
        timeout,
        description: `Element does not have text "${text}"`,
      },
    );
  }

  /**
   * Legacy method: Check if an element does not have specific label
   * @deprecated Use expectNotVisible() or custom assertion instead for better error handling and retry mechanisms
   */
  static async checkIfElementDoesNotHaveLabel(
    elementPromise: Promise<Detox.IndexableNativeElement>,
    label: string,
    timeout = 15000,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = await elementPromise;
        await waitFor(el).not.toHaveLabel(label).withTimeout(1000);
      },
      {
        timeout,
        description: `Element does not have label "${label}"`,
      },
    );
  }

  /**
   * Legacy method: Check if toggle is in "on" state
   * @deprecated Use expectToggleState() instead for better error handling and retry mechanisms
   */
  static async checkIfToggleIsOn(
    elementPromise: Promise<Detox.IndexableNativeElement>,
  ): Promise<void> {
    const el = await elementPromise;
    // Use Detox's expect syntax for toggle values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, jest/valid-expect
    await (expect(el) as any).toHaveToggleValue(true);
  }

  /**
   * Legacy method: Check if toggle is in "off" state
   * @deprecated Use expectToggleState() instead for better error handling and retry mechanisms
   */
  static async checkIfToggleIsOff(
    elementPromise: Promise<Detox.IndexableNativeElement>,
  ): Promise<void> {
    const el = await elementPromise;
    // Use Detox's expect syntax for toggle values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, jest/valid-expect
    await (expect(el) as any).toHaveToggleValue(false);
  }

  /**
   * Legacy method: Check if two text values match exactly
   * @deprecated Use Jest expect() directly or custom assertion instead
   */
  static async checkIfTextMatches(actualText: string, expectedText: string): Promise<void> {
    try {
      if (!actualText || !expectedText) {
        throw new Error('Both actual and expected text must be provided');
      }

      return expect(actualText).toBe(expectedText);
    } catch (error) {
      if (actualText !== expectedText) {
        throw new Error(
          `Text matching failed.\nExpected: "${expectedText}"\nActual: "${actualText}"`,
        );
      }
    }
  }

  /**
   * Legacy method: Check if two objects match exactly
   * @deprecated Use Jest expect() directly or custom assertion instead
   */
  static async checkIfObjectsMatch(actualObject: object, expectedObject: object): Promise<void> {
    try {
      if (!actualObject || !expectedObject) {
        throw new Error('Both actual and expected objects must be provided');
      }

      return expect(actualObject).toEqual(expectedObject);
    } catch (error) {
      if (JSON.stringify(actualObject) !== JSON.stringify(expectedObject)) {
        throw new Error(
          `Object matching failed.\nExpected: ${JSON.stringify(
            expectedObject,
            null,
            2,
          )}\nActual: ${JSON.stringify(actualObject, null, 2)}`,
        );
      }
    }
  }

  /**
   * Legacy method: Check if an array has the expected length
   * @deprecated Use Jest expect() directly or custom assertion instead
   */
  static async checkIfArrayHasLength(array: unknown[], expectedLength: number): Promise<void> {
    try {
      if (!Array.isArray(array)) {
        throw new Error('The provided value is not an array');
      }

      if (typeof expectedLength !== 'number') {
        throw new Error('Expected length must be a number');
      }

      return expect(array.length).toBe(expectedLength);
    } catch (error) {
      if (array.length !== expectedLength) {
        throw new Error(
          `Array length assertion failed.\nExpected length: ${expectedLength}\nActual length: ${array.length}`,
        );
      }
    }
  }

  /**
   * Legacy method: Check if a value is defined
   * @deprecated Use Jest expect() directly or custom assertion instead
   */
  static async checkIfValueIsDefined(value: unknown): Promise<void> {
    // 0 evaluates to false, so we need to handle it separately
    if (typeof value === 'number') {
      return;
    }

    if (!value) {
      throw new Error('Value is not present (falsy value)');
    }
  }

  /**
   * Legacy method: Checks if the actual object contains all key/value pairs from the partial object
   * @deprecated Use Jest expect().toMatchObject() instead
   */
  static async checkIfObjectContains(
    actual: Record<string, unknown>,
    partial: Record<string, unknown>,
    deep = true,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const errors: string[] = [];

      function check(
        actualObj: Record<string, unknown>,
        partialObj: Record<string, unknown>,
        path = '',
      ) {
        if (
          typeof actualObj !== 'object' ||
          typeof partialObj !== 'object' ||
          actualObj === null ||
          partialObj === null
        ) {
          if (actualObj !== partialObj) {
            errors.push(
              `Value mismatch at "${path || 'root'}": expected ${JSON.stringify(
                partialObj,
              )}, got ${JSON.stringify(actualObj)}`,
            );
          }
          return;
        }

        for (const key in partialObj) {
          const currentPath = path ? `${path}.${key}` : key;
          if (!Object.prototype.hasOwnProperty.call(actualObj, key)) {
            errors.push(`Missing key at "${currentPath}" in actual object`);
            continue;
          }

          if (
            deep &&
            typeof partialObj[key] === 'object' &&
            partialObj[key] !== null
          ) {
            check(
              actualObj[key] as Record<string, unknown>,
              partialObj[key] as Record<string, unknown>,
              currentPath,
            );
          } else if (actualObj[key] !== partialObj[key]) {
            errors.push(
              `Value mismatch at "${currentPath}": expected ${JSON.stringify(
                partialObj[key],
              )}, got ${JSON.stringify(actualObj[key])}`,
            );
          }
        }
      }

      check(actual, partial);

      if (errors.length > 0) {
        reject(
          new Error('Object contains assertion failed:\n' + errors.join('\n')),
        );
      } else {
        resolve();
      }
    });
  }

  /**
   * Legacy method: Check if element is enabled
   * @deprecated Use Utilities.waitForElementToBeEnabled() instead for better retry handling
   */
  static async checkIfEnabled(
    elementPromise: Promise<Detox.IndexableNativeElement>,
  ): Promise<boolean> {
    const el = await elementPromise;
    const attributes = await el.getAttributes();
    return 'enabled' in attributes ? !!attributes.enabled : false;
  }

  /**
   * Legacy method: Check if element is disabled
   * @deprecated Use Utilities.waitForElementToBeEnabled() with negated logic instead
   */
  static async checkIfDisabled(
    elementPromise: Promise<Detox.IndexableNativeElement>,
  ): Promise<boolean> {
    const el = await elementPromise;
    const attributes = await el.getAttributes();
    return 'enabled' in attributes ? !attributes.enabled : true;
  }

  /**
   * Legacy method: Check if label contains text
   * @deprecated Use expectLabel() with regex pattern instead for better error handling and retry mechanisms
   */
  static async checkIfLabelContainsText(text: string, timeout = 15000): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const labelMatcher = element(by.label(new RegExp(text)));
        await waitFor(labelMatcher).toExist().withTimeout(1000);
      },
      {
        timeout,
        description: `Label contains text "${text}"`,
      },
    );
  }
}
