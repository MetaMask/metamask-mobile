import Utilities, { BASE_DEFAULTS, stripJsonKeys } from './Utilities.ts';
import { AssertionOptions } from './types.ts';
import type { AppiumElement, AppiumElementRef } from './AppiumElement.ts';
import { Json } from '@metamask/utils';
import { PlatformDetector } from './PlatformLocator.ts';
import AppiumAssertions from './AppiumAssertions.ts';

/**
 * Assertions with auto-retry and better error messages
 */
export default class Assertions {
  /**
   * Assert element is visible with auto-retry
   */
  static async expectElementToBeVisible(
    elem: AppiumElementRef | (() => AppiumElementRef),
    options: AssertionOptions = {},
  ): Promise<void> {
    const resolved = typeof elem === 'function' ? elem() : elem;
    return AppiumAssertions.expectElementToBeVisible(
      resolved as AppiumElementRef,
      options,
    );
  }

  /**
   * Assert element exists in the hierarchy (may not report as displayed).
   * Use for BottomSheet / confirmation children under Appium where
   * isDisplayed=false while the UI is on screen.
   */
  static async expectElementToExist(
    elem: AppiumElementRef | (() => AppiumElementRef),
    options: AssertionOptions = {},
  ): Promise<void> {
    const resolved = typeof elem === 'function' ? elem() : elem;
    return AppiumAssertions.expectElementToExist(
      resolved as AppiumElementRef,
      options,
    );
  }

  /**
   * Assert element is not visible with auto-retry
   */
  static async expectElementToNotBeVisible(
    elem: AppiumElementRef | (() => AppiumElementRef),
    options: AssertionOptions = {},
  ): Promise<void> {
    const resolved = typeof elem === 'function' ? elem() : elem;
    return AppiumAssertions.expectElementToNotBeVisible(
      resolved as AppiumElementRef,
      options,
    );
  }

  /**
   * Assert element has specific text with auto-retry
   */
  static async expectElementToHaveText(
    elem: AppiumElementRef,
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    return AppiumAssertions.expectElementText(elem, text, options);
  }

  /**
   * Assert element contains specific text with auto-retry
   */
  static async expectElementToContainText(
    elem: AppiumElementRef,
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = `element contains text "${text}"`,
    } = options;

    const el = await elem;
    return Utilities.executeWithRetry(
      async () => {
        const actual = ((await el.textContent()) ?? '').trim();
        if (!actual.includes(text)) {
          throw new Error(
            `Expected text containing "${text}" but got "${actual}"`,
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
    elem: AppiumElementRef,
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    return AppiumAssertions.expectElementNotToHaveText(elem, text, options);
  }

  /**
   * Assert element has specific label with auto-retry
   */
  static async expectElementToHaveLabel(
    elem: AppiumElementRef,
    label: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    return AppiumAssertions.expectElementToHaveLabel(elem, label, options);
  }

  /**
   * Assert text is displayed anywhere on screen with auto-retry
   */
  static async expectTextDisplayed(
    text: string,
    options: AssertionOptions & { allowDuplicates?: boolean } = {},
  ): Promise<void> {
    return AppiumAssertions.expectTextDisplayed(text, options);
  }

  /**
   * Assert text is not displayed anywhere on screen with auto-retry
   */
  static async expectTextNotDisplayed(
    text: string,
    options: AssertionOptions = {},
  ): Promise<void> {
    return AppiumAssertions.expectTextNotDisplayed(text, options);
  }

  /**
   * Returns whether a Switch/toggle is currently on.
   */
  static async isToggleOn(elem: AppiumElementRef): Promise<boolean> {
    const el = await elem;
    // Each Appium driver only supports the attribute native to its Switch:
    // iOS XCUITest exposes `value` (`"1"` / `"0"`); Android UiAutomator2 exposes
    // `checked` (`"true"` / `"false"`). Querying the other one throws
    // `attribute is unknown`, so read only the platform-appropriate attribute.
    const attributeName = PlatformDetector.isIOS() ? 'value' : 'checked';
    const attributeValue = await el.getAttribute(attributeName);

    if (attributeValue === '1' || attributeValue === 'true') {
      return true;
    }
    if (attributeValue === '0' || attributeValue === 'false') {
      return false;
    }
    throw new Error(
      `Unable to determine toggle state from attribute ${attributeName}=${String(
        attributeValue,
      )}`,
    );
  }

  /**
   * Assert element is enabled with auto-retry
   */
  static async expectToggleToBeOn(
    elem: AppiumElementRef,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = 'element should be enabled',
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const isOn = await this.isToggleOn(elem);
        if (!isOn) {
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
    elem: AppiumElementRef,
    options: AssertionOptions = {},
  ): Promise<void> {
    const {
      timeout = BASE_DEFAULTS.timeout,
      description = 'element should be disabled',
    } = options;

    return Utilities.executeWithRetry(
      async () => {
        const isOn = await this.isToggleOn(elem);
        if (isOn) {
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

      expect(actualText).toBe(expectedText);
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

  /**
   * Checks if the array has a minimum length
   * @param array - The array to check
   * @param minLength - The minimum length of the array
   * @returns void
   */
  static async checkIfArrayHasMinLength(
    array: unknown[],
    minLength: number,
  ): Promise<void> {
    if (!Array.isArray(array)) {
      throw new Error('The provided value is not an array');
    }
    if (array.length < minLength) {
      throw new Error(
        `Array length assertion failed.\nExpected at least: ${minLength}\nActual length: ${array.length}`,
      );
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
    elem: AppiumElementRef,
    timeout = 15000,
  ): Promise<void> {
    return this.expectElementToBeVisible(elem, { timeout });
  }

  /**
   * Legacy method: Check if a web element exists
   * @deprecated Use expectElementToBeVisible() instead for better error handling and retry mechanisms
   */
  static async webViewElementExists(elem: AppiumElementRef): Promise<void> {
    return this.expectElementToExist(elem);
  }

  /**
   * Legacy method: Check if an element is not visible
   * @deprecated Use expectElementToNotBeVisible() instead for better error handling and retry mechanisms
   */
  static async checkIfNotVisible(
    elem: AppiumElementRef,
    timeout = 15000,
  ): Promise<void> {
    return this.expectElementToNotBeVisible(elem, {
      timeout,
    });
  }

  /**
   * Legacy method: Check if an element has specific text
   * @deprecated Use expectElementToHaveText() instead for better error handling and retry mechanisms
   */
  static async checkIfElementToHaveText(
    elem: AppiumElementRef,
    text: string,
    timeout = 15000,
  ): Promise<void> {
    return this.expectElementToHaveText(elem, text, {
      timeout,
    });
  }

  /**
   * Legacy method: Check if an element has specific label
   * @deprecated Use expectElementToHaveLabel() instead for better error handling and retry mechanisms
   */
  static async checkIfElementHasLabel(
    elem: AppiumElementRef,
    label: string,
    timeout = 15000,
  ): Promise<void> {
    return this.expectElementToHaveLabel(elem, label, { timeout });
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
    return this.expectTextNotDisplayed(text, { timeout });
  }

  /**
   * Legacy method: Check if an element does not have specific text
   * @deprecated Use expectElementToNotHaveText() or custom assertion instead for better error handling and retry mechanisms
   */
  static async checkIfElementNotToHaveText(
    elem: AppiumElementRef,
    text: string,
    timeout = 15000,
  ): Promise<void> {
    return this.expectElementToNotHaveText(elem, text, { timeout });
  }

  /**
   * Legacy method: Check if an element does not have specific label
   * @deprecated Use expectElementToNotBeVisible() or custom assertion instead for better error handling and retry mechanisms
   */
  static async checkIfElementDoesNotHaveLabel(
    elem: AppiumElementRef,
    _label: string,
    timeout = 15000,
  ): Promise<void> {
    return this.expectElementToNotBeVisible(elem, { timeout });
  }

  /**
   * Legacy method: Check if toggle is in "on" state
   * @deprecated Use expectToggleToBeOn() instead for better error handling and retry mechanisms
   */
  static async checkIfToggleIsOn(elem: AppiumElementRef): Promise<void> {
    return this.expectToggleToBeOn(elem);
  }

  /**
   * Legacy method: Check if toggle is in "off" state
   * @deprecated Use expectToggleToBeOff() instead for better error handling and retry mechanisms
   */
  static async checkIfToggleIsOff(elem: AppiumElementRef): Promise<void> {
    return this.expectToggleToBeOff(elem);
  }

  /**
   * Legacy method: Check if element is enabled
   * @deprecated Use Utilities.waitForElementToBeEnabled() instead for better retry handling
   */
  static async checkIfEnabled(elem: AppiumElementRef): Promise<boolean> {
    const el = await elem;
    return el.isEnabled();
  }

  /**
   * Legacy method: Check if element is disabled
   * @deprecated Use Utilities.waitForElementToBeDisabled() instead for better retry handling
   */
  static async checkIfDisabled(elem: AppiumElementRef): Promise<boolean> {
    const el = await elem;
    return !(await el.isEnabled());
  }

  /**
   * Legacy method: Check if label contains text
   * @deprecated Use expectLabel() with regex pattern instead for better error handling and retry mechanisms
   */
  static async checkIfLabelContainsText(
    text: string,
    timeout = 15000,
  ): Promise<void> {
    return this.expectTextDisplayed(text, { timeout });
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

  /**
   * Parse a JSON string and assert equality (objects, arrays, and primitives).
   */
  static async checkParsedJsonEqual(
    actualText: string,
    expectedJson: Json,
    description = 'result',
  ): Promise<void> {
    let actualJson: Json;
    try {
      actualJson = JSON.parse(actualText) as Json;
    } catch {
      throw new Error(
        `Failed to parse JSON from ${description}: ${actualText}`,
      );
    }
    await this.checkIfJsonEqual(actualJson, expectedJson);
  }

  /**
   * Parse a JSON string, strip excluded keys, and assert equality.
   */
  static async checkParsedJsonEqualExcluding(
    actualText: string,
    expectedJson: Json,
    excludedKeys: string[],
    description = 'result',
  ): Promise<void> {
    let actualJson: Json;
    try {
      actualJson = JSON.parse(actualText) as Json;
    } catch {
      throw new Error(
        `Failed to parse JSON from ${description}: ${actualText}`,
      );
    }
    await this.checkIfJsonEqual(
      stripJsonKeys(actualJson, excludedKeys),
      stripJsonKeys(expectedJson, excludedKeys),
    );
  }
}
