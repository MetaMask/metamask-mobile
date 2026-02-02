import { waitFor } from 'detox';
import Utilities, { BASE_DEFAULTS } from './Utilities.ts';
import { AssertionOptions } from './types.ts';
import Matchers from './Matchers.ts';
import { Json } from '@metamask/utils';

/**
 * Assertions with auto-retry and better error messages
 */
export default class Assertions {
  /**
   * Assert element is visible with auto-retry
   */
  static async expectElementToBeVisible(
    detoxElement:
      | DetoxElement
      | WebElement
      | DetoxMatcher
      | IndexableNativeElement,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = 'element should be visible',
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await detoxElement;
        const isWebElement = Utilities.isWebElement(el);
        if (isWebElement) {
          // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
          await (expect(el) as any).toExist();
        } else if (device.getPlatform() === 'ios') {
          await waitFor(el).toExist().withTimeout(100);
        } else {
          await waitFor(el).toBeVisible().withTimeout(100);
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
  static async expectElementToNotBeVisible(
    detoxElement:
      | DetoxElement
      | WebElement
      | DetoxMatcher
      | IndexableNativeElement,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = 'element should not visible',
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await detoxElement;
        const isWebElement = Utilities.isWebElement(el);
        if (isWebElement) {
          // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
          await (expect(el) as any).not.toExist();
        } else {
          await waitFor(el).not.toBeVisible().withTimeout(100);
        }
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
  static async expectElementToHaveText(
    detoxElement: DetoxElement,
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = `element has text "${text}"`,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await detoxElement) as Detox.IndexableNativeElement;
        await waitFor(el).toHaveText(text).withTimeout(100);
      },
      {
        timeout,
        description: `Assert ${description}`,
      },
    );
  }

  static async expectWebElementToHaveText(
    webElement: WebElement,
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = `element has text "${text}"`,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await webElement;
        const actualText = (await el.getText()) as string;

        if (actualText !== text) {
          console.log(
            '🚀 ~ Assertions ~ returnUtilities.executeWithRetry ~ actualText:',
            actualText,
          );
          console.log(
            '🚀 ~ Assertions ~ returnUtilities.executeWithRetry ~ text:',
            text,
          );
          throw new Error(
            `Element has text mismatch.\nExpected: "${text}"\nActual: "${actualText}"`,
          );
        }
      },
      {
        timeout,
        description: `Assert ${description}`,
      },
    );
  }

  /**
   * Assert element contains specific text with auto-retry
   */
  static async expectElementToContainText(
    webElement: WebElement,
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = `element contains text "${text}"`,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = await webElement;
        const actualText = await el.getText();
        const normalizedText = actualText
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
        const expectedText = text.toLowerCase();
        if (!normalizedText.includes(expectedText)) {
          throw new Error(
            `Expected text containing "${text}" but got "${actualText}"`,
          );
        }
      },
      {
        timeout,
        description: `Assert ${description}`,
      },
    );
  }

  /**
   * Assert element does not have specific text with auto-retry
   */
  static async expectElementToNotHaveText(
    detoxElement: DetoxElement,
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = `element does not have text "${text}"`,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await detoxElement) as Detox.IndexableNativeElement;
        await waitFor(el).not.toHaveText(text).withTimeout(100);
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
  static async expectElementToHaveLabel(
    detoxElement: DetoxElement,
    label: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = `element has label "${label}"`,
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const el = (await detoxElement) as Detox.IndexableNativeElement;
        await waitFor(el).toHaveLabel(label).withTimeout(100);
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
    options: AssertionOptions & { allowDuplicates?: boolean } = {},
  ): Promise<void> {
    const { timeout = BASE_DEFAULTS.timeout, allowDuplicates = false } =
      options;

    return Utilities.executeWithRetry(
      async () => {
        const textElement = allowDuplicates
          ? (await Matchers.getElementByText(text)).atIndex(0)
          : await Matchers.getElementByText(text);
        if (device.getPlatform() === 'ios') {
          await waitFor(textElement).toExist().withTimeout(100);
        } else {
          await waitFor(textElement).toBeVisible().withTimeout(100);
        }
      },
      {
        timeout,
        description: `Assert text "${text}" is displayed${
          allowDuplicates ? ' (allowing duplicates)' : ''
        }`,
      },
    );
  }

  /**
   * Assert text is not displayed anywhere on screen with auto-retry
   */
  static async expectTextNotDisplayed(
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const { timeout = BASE_DEFAULTS.timeout } = options;
    return Utilities.executeWithRetry(
      async () => {
        const textElement = await Matchers.getElementByText(text);
        if (device.getPlatform() === 'ios') {
          await waitFor(textElement).not.toExist().withTimeout(100);
        } else {
          await waitFor(textElement).not.toBeVisible().withTimeout(100);
        }
      },
      {
        timeout,
        description: `expectTextNotDisplayed("${text}")`,
      },
    );
  }

  /**
   * Assert element is enabled with auto-retry
   */
  static async expectToggleToBeOn(
    detoxElement: DetoxElement,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = 'element should be enabled',
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        try {
          const el = (await Utilities.waitForReadyState(
            detoxElement,
          )) as Detox.IndexableNativeElement;
          // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
          await (expect(el) as any).toHaveToggleValue(true);
        } catch (error) {
          // Log attributes for debugging
          throw new Error(
            [
              '🔄 Toggle state mismatch detected',
              `   Expected: on`,
              `   Actual:   off`,
            ].join('\n'),
          );
        }
      },
      {
        timeout,
        description: `Assert ${description}`,
      },
    );
  }

  /**
   * Assert element is disabled with auto-retry
   */
  static async expectToggleToBeOff(
    detoxElement: DetoxElement,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = 'element should be disabled',
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        try {
          const el = (await Utilities.waitForReadyState(
            detoxElement,
          )) as Detox.IndexableNativeElement;
          // eslint-disable-next-line jest/valid-expect, @typescript-eslint/no-explicit-any
          await (expect(el) as any).toHaveToggleValue(false);
        } catch (error) {
          throw new Error(
            [
              '🔄 Toggle state mismatch detected',
              `   Expected: off`,
              `   Actual:   on`,
            ].join('\n'),
          );
        }
      },
      {
        timeout,
        description: `Assert ${description}`,
      },
    );
  }

  static async checkIfTextMatches(
    actualText: string,
    expectedText: string,
  ): Promise<void> {
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

  static async checkIfObjectsMatch(
    actualObject: object,
    expectedObject: object,
  ): Promise<void> {
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

  static async checkIfArrayHasLength(
    array: unknown[],
    expectedLength: number,
  ): Promise<void> {
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

  static async checkIfValueIsDefined(value: unknown): Promise<void> {
    // 0 evaluates to false, so we need to handle it separately
    if (typeof value === 'number') {
      return;
    }

    if (!value) {
      throw new Error('Value is not present (falsy value)');
    }
  }

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
   * Checks if the actual object contains all keys from the expected array
   * @param actual - The object to check against
   * @param validations - Object with keys and their expected values
   */
  static async checkIfObjectHasKeysAndValidValues(
    actual: Record<string, unknown>,
    validations: Record<string, string | ((value: unknown) => boolean)>,
  ): Promise<void> {
    const errors: string[] = [];

    for (const [key, validation] of Object.entries(validations)) {
      if (!Object.prototype.hasOwnProperty.call(actual, key)) {
        errors.push(`Missing key: ${key}`);
        continue;
      }

      const value = actual[key];

      if (typeof validation === 'string') {
        const actualType = typeof value;

        if (Array.isArray(value) && validation === 'array') continue;
        if (value === null && validation === 'null') continue;

        // Check type
        if (
          actualType !== validation &&
          !(Array.isArray(value) && validation === 'array')
        ) {
          errors.push(
            `Type mismatch for key "${key}": expected "${validation}", got "${actualType}"`,
          );
        }
      } else if (typeof validation === 'function') {
        try {
          const valid = validation(value);
          if (!valid) {
            errors.push(
              `Validation failed for key "${key}": custom validator returned false`,
            );
          }
        } catch (err) {
          errors.push(
            `Validation error for key "${key}": ${(err as Error).message}`,
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new Error('Object validation failed:\n' + errors.join('\n'));
    }
  }

  /**
   * Legacy method: Check if an element is visible (backwards compatibility)
   * @deprecated Use expectElementToBeVisible() instead for better error handling and retry mechanisms
   */
  static async checkIfVisible(
    detoxElement: DetoxElement,
    timeout = 15000,
  ): Promise<void> {
    return this.expectElementToBeVisible(detoxElement, { timeout });
  }

  /**
   * Legacy method: Check if a web element exists
   * @deprecated Use expectElementToBeVisible() instead for better error handling and retry mechanisms
   */
  static async webViewElementExists(detoxElement: DetoxElement): Promise<void> {
    // For web elements, just use the basic expect assertion
    const el = (await detoxElement) as Detox.IndexableNativeElement;
    // Use Detox's expect which has toExist method
    // Use Detox's expect syntax for element existence
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, jest/valid-expect
    await (expect(el) as any).toExist();
  }

  /**
   * Legacy method: Check if an element is not visible
   * @deprecated Use expectElementToNotBeVisible() instead for better error handling and retry mechanisms
   */
  static async checkIfNotVisible(
    detoxElement: DetoxElement,
    timeout = 15000,
  ): Promise<void> {
    return this.expectElementToNotBeVisible(detoxElement as DetoxElement, {
      timeout,
    });
  }

  /**
   * Legacy method: Check if an element has specific text
   * @deprecated Use expectElementToHaveText() instead for better error handling and retry mechanisms
   */
  static async checkIfElementToHaveText(
    detoxElement: DetoxElement,
    text: string,
    timeout = 15000,
  ): Promise<void> {
    return this.expectElementToHaveText(detoxElement as DetoxElement, text, {
      timeout,
    });
  }

  /**
   * Legacy method: Check if an element has specific label
   * @deprecated Use expectElementToHaveLabel() instead for better error handling and retry mechanisms
   */
  static async checkIfElementHasLabel(
    detoxElement: DetoxElement,
    label: string,
    timeout = 15000,
  ): Promise<void> {
    return this.expectElementToHaveLabel(detoxElement, label, { timeout });
  }

  /**
   * Legacy method: Check if text is displayed anywhere on screen
   * @deprecated Use expectTextDisplayed() instead for better error handling and retry mechanisms
   */
  static async checkIfTextIsDisplayed(
    text: string,
    timeout = 15000,
  ): Promise<void> {
    return this.expectTextDisplayed(text, { timeout });
  }

  /**
   * Legacy method: Check if text is not displayed
   * @deprecated Use expectTextNotDisplayed() or custom assertion instead for better error handling and retry mechanisms
   */
  static async checkIfTextIsNotDisplayed(
    text: string,
    timeout = 15000,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const textElement = await Matchers.getElementByText(text);
        await waitFor(textElement).not.toBeVisible().withTimeout(100);
      },
      {
        timeout,
        description: `Text "${text}" is not displayed`,
      },
    );
  }

  /**
   * Legacy method: Check if an element does not have specific text
   * @deprecated Use expectElementToNotHaveText() or custom assertion instead for better error handling and retry mechanisms
   */
  static async checkIfElementNotToHaveText(
    detoxElement: DetoxElement,
    text: string,
    timeout = 15000,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await detoxElement) as Detox.IndexableNativeElement;
        await waitFor(el).not.toHaveText(text).withTimeout(100);
      },
      {
        timeout,
        description: `Element does not have text "${text}"`,
      },
    );
  }

  /**
   * Legacy method: Check if an element does not have specific label
   * @deprecated Use expectElementToNotBeVisible() or custom assertion instead for better error handling and retry mechanisms
   */
  static async checkIfElementDoesNotHaveLabel(
    detoxElement: DetoxElement,
    label: string,
    timeout = 15000,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const el = (await detoxElement) as Detox.IndexableNativeElement;
        await waitFor(el).not.toHaveLabel(label).withTimeout(100);
      },
      {
        timeout,
        description: `Element does not have label "${label}"`,
      },
    );
  }

  /**
   * Legacy method: Check if toggle is in "on" state
   * @deprecated Use expectToggleToBeOn() instead for better error handling and retry mechanisms
   */
  static async checkIfToggleIsOn(detoxElement: DetoxElement): Promise<void> {
    const el = (await detoxElement) as Detox.IndexableNativeElement;
    // Use Detox's expect syntax for toggle values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, jest/valid-expect
    await (expect(el) as any).toHaveToggleValue(true);
  }

  /**
   * Legacy method: Check if toggle is in "off" state
   * @deprecated Use expectToggleToBeOff() instead for better error handling and retry mechanisms
   */
  static async checkIfToggleIsOff(detoxElement: DetoxElement): Promise<void> {
    const el = (await detoxElement) as Detox.IndexableNativeElement;
    // Use Detox's expect syntax for toggle values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, jest/valid-expect
    await (expect(el) as any).toHaveToggleValue(false);
  }

  /**
   * Legacy method: Check if element is enabled
   * @deprecated Use Utilities.waitForElementToBeEnabled() instead for better retry handling
   */
  static async checkIfEnabled(detoxElement: DetoxElement): Promise<boolean> {
    const el = (await detoxElement) as Detox.IndexableNativeElement;
    const attributes = await el.getAttributes();
    return 'enabled' in attributes ? !!attributes.enabled : false;
  }

  /**
   * Legacy method: Check if element is disabled
   * @deprecated Use Utilities.waitForElementToBeEnabled() with negated logic instead
   */
  static async checkIfDisabled(detoxElement: DetoxElement): Promise<boolean> {
    const el = (await detoxElement) as Detox.IndexableNativeElement;
    const attributes = await el.getAttributes();
    return 'enabled' in attributes ? !attributes.enabled : true;
  }

  /**
   * Legacy method: Check if label contains text
   * @deprecated Use expectLabel() with regex pattern instead for better error handling and retry mechanisms
   */
  static async checkIfLabelContainsText(
    text: string,
    timeout = 15000,
  ): Promise<void> {
    return Utilities.executeWithRetry(
      async () => {
        const labelMatcher = element(by.label(new RegExp(text)));
        await waitFor(labelMatcher).toExist().withTimeout(100);
      },
      {
        timeout,
        description: `Label contains text "${text}"`,
      },
    );
  }

  static async checkIfJsonEqual(actual: Json, expected: Json): Promise<void> {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        `Object equality check failed.\nExpected: ${JSON.stringify(
          expected,
          null,
          2,
        )}\nActual: ${JSON.stringify(actual, null, 2)}`,
      );
    }
  }
}
