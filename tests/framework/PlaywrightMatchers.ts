import { PlatformDetector } from './PlatformLocator';
import { PlaywrightElement, wrapElement } from './PlaywrightAdapter';
import { MatcherOptions } from './types';
import { getDriver } from './PlaywrightUtilities';
import { ChainablePromiseElement } from 'webdriverio';
import { createPlaywrightLogger } from './playwrightLogger.ts';

const logger = createPlaywrightLogger('PlaywrightMatchers');

/**
 * PlaywrightMatchers - Element selectors that return Playwright-like wrapped
 * elements.
 *
 * These matchers use WebdriverIO's robust element finding under the hood,
 * but return elements with Playwright-style API (fill, click, textContent, etc.).
 *
 * All these functions can later take use of the original Detox framework with
 * the executeWithRetry approach, for the time being we're relying on the
 * WebdriverIO framework only.
 *
 * @example
 * const element = await PlaywrightMatchers.getByAccessibilityId('login-button');
 * await element.fill('myusername');
 * await element.click();
 * const text = await element.textContent();
 * console.log(text);
 */
export default class PlaywrightMatchers {
  private static logFind(strategy: string, target: string): void {
    logger.debug(`Finding element by ${strategy}: ${target}`);
  }

  /**
   * Get element by accessibility ID (iOS) or content-desc/resource-id (Android)
   * This is the most common selector for mobile apps
   *
   * @param elementId - The accessibility ID or content-desc/resource-id of the element
   * @returns The wrapped element
   */
  static async getElementByAccessibilityId(
    elementId: string,
    options: MatcherOptions = {},
  ): Promise<PlaywrightElement> {
    const { index } = options;
    this.logFind('accessibility id', elementId);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    if (index !== undefined) {
      const elements = await drv.$$(`~${elementId}`);
      return wrapElement(elements[index] as unknown as ChainablePromiseElement);
    }
    const element = await drv.$(`~${elementId}`);
    return wrapElement(element);
  }

  /**
   * Get element by ID (Android resource-id or iOS accessibility identifier)
   *
   * @param elementId - The ID of the element
   * @param MatcherOptions - The options for the matcher
   * @param MatcherOptions.exact - Whether to match the exact ID or not
   * @returns The wrapped element
   */
  static async getElementById(
    elementId: string | RegExp,
    options: MatcherOptions = {},
  ): Promise<PlaywrightElement> {
    if (elementId instanceof RegExp) {
      const isAndroid = await PlatformDetector.isAndroid();
      const escaped = isAndroid
        ? this.escapeRegexPatternForUiAutomator(elementId)
        : this.escapeRegexPattern(elementId);
      this.logFind('id pattern', elementId.source);
      // Android resource IDs are package-qualified (e.g. io.metamask:id/browser-tab-1).
      // Detox by.id(RegExp) matches the suffix; UiAutomator resourceIdMatches needs .*…*.
      const androidPattern = `.*${escaped}.*`;
      const locator = isAndroid
        ? `android=new UiSelector().resourceIdMatches("${androidPattern}")`
        : `-ios predicate string:name MATCHES "${escaped}"`;

      const drv = getDriver();
      if (!drv) throw new Error('Driver is not available');
      if (options.index !== undefined) {
        return this.resolveIndexedElementByLocator(
          locator,
          options.index,
          `resource id pattern ${elementId.source}`,
        );
      }
      const element = await drv.$(locator);
      return wrapElement(element);
    }

    const { exact = true } = options;
    this.logFind('id', `${elementId}${exact ? '' : ' (partial)'}`);

    let locator: string;
    const isAndroid = await PlatformDetector.isAndroid();
    if (isAndroid) {
      locator = 'android=new UiSelector()';
      locator = exact
        ? `${locator}.resourceId("${elementId}")`
        : `${locator}.resourceIdMatches(".*${elementId}.*")`;
    } else {
      locator = exact
        ? `~${elementId}`
        : `-ios predicate string:name CONTAINS "${elementId}"`;
    }

    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    if (options.index !== undefined) {
      return this.resolveIndexedElementByLocator(
        locator,
        options.index,
        `id ${String(elementId)}`,
      );
    }
    const element = await drv.$(locator);
    return wrapElement(element);
  }

  /**
   * Get element by text content (cross-platform)
   * @param text - The text to search for
   * @returns The wrapped element
   */
  static async getElementByText(
    text: string | RegExp,
    exactMatch: boolean = false,
    options: MatcherOptions = {},
  ): Promise<PlaywrightElement> {
    if (text instanceof RegExp) {
      const isAndroid = await PlatformDetector.isAndroid();
      const escaped = isAndroid
        ? this.escapeRegexPatternForUiAutomator(text)
        : this.escapeRegexPattern(text);
      this.logFind('text pattern', text.source);
      const locator = isAndroid
        ? `android=new UiSelector().textMatches("${escaped}")`
        : `-ios predicate string:label MATCHES "${escaped}" OR name MATCHES "${escaped}"`;

      const drv = getDriver();
      if (!drv) throw new Error('Driver is not available');
      const index = options.index ?? 0;
      if (index > 0) {
        const elements = await drv.$$(locator);
        return wrapElement(
          elements[index] as unknown as ChainablePromiseElement,
        );
      }
      const element = await drv.$(locator);
      return wrapElement(element);
    }

    this.logFind('text', `${text}${exactMatch ? ' (exact)' : ''}`);
    const isAndroid = await PlatformDetector.isAndroid();
    const escapedText = text.replace(/'/g, "\\'");
    let xpath: string;
    if (exactMatch) {
      xpath = isAndroid
        ? `//*[@name='${escapedText}' or @label='${escapedText}' or @text='${escapedText}' or @content-desc='${escapedText}']`
        : `//*[@name='${escapedText}' or @label='${escapedText}' or @text='${escapedText}']`;
    } else {
      xpath = isAndroid
        ? `//*[contains(@name,'${escapedText}') or contains(@label,'${escapedText}') or contains(@text,'${escapedText}') or contains(@content-desc,'${escapedText}')]`
        : `//*[contains(@name,'${escapedText}') or contains(@label,'${escapedText}') or contains(@text,'${escapedText}')]`;
    }
    return await this.getElementByXPath(xpath, options);
  }

  private static escapeRegexPattern(pattern: RegExp): string {
    return pattern.source.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /**
   * UiAutomator `*Matches()` uses Java regex but does not support `\d` / `\D` shorthands.
   */
  private static escapeRegexPatternForUiAutomator(pattern: RegExp): string {
    return this.escapeRegexPattern(pattern)
      .replace(/\\d/g, '[0-9]')
      .replace(/\\D/g, '[^0-9]');
  }

  /**
   * Resolves an indexed element from a multi-match locator.
   * When `$$` returns no matches, falls back to a lazy `$` ref so negative
   * assertions (e.g. expectElementToNotBeVisible) can poll until absent.
   * Throws when matches exist but the requested index is out of range.
   */
  private static async resolveIndexedElementByLocator(
    locator: string,
    index: number,
    targetDescription: string,
  ): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const elements = await drv.$$(locator);
    const matchCount = await elements.length;
    const element = elements[index] as unknown as
      | ChainablePromiseElement
      | undefined;
    if (element) {
      return wrapElement(element);
    }
    if (matchCount === 0) {
      return wrapElement(
        (await drv.$(locator)) as unknown as ChainablePromiseElement,
      );
    }
    throw new Error(
      `No element at index ${index} for ${targetDescription} (found ${matchCount} match(es)).`,
    );
  }

  /**
   * Get element by catch-all selector that works on both platforms
   * @param identifier - The identifier to search for
   * @returns The wrapped element
   */
  static async getElementByCatchAll(
    identifier: string,
    options: MatcherOptions = {},
  ): Promise<PlaywrightElement> {
    this.logFind('catch-all', identifier);
    const isAndroid = await PlatformDetector.isAndroid();
    let xpath = '';
    if (isAndroid) {
      xpath = `//*[@resource-id='${identifier}' or contains(@text,'${identifier}') or contains(@content-desc,'${identifier}')]`;
    } else {
      xpath = `//*[contains(@name,'${identifier}') or contains(@label,'${identifier}') or contains(@text,'${identifier}')]`;
    }
    return await this.getElementByXPath(xpath, options);
  }

  /**
   * Get multiple elements by text content
   * @param text - The text to search for
   * @returns The wrapped elements
   */
  static async getAllElementsByText(
    text: string,
  ): Promise<PlaywrightElement[]> {
    this.logFind('all elements by text', text);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const elements = await drv.$$(`*.=${text}`);
    return elements.map((el) =>
      wrapElement(el as unknown as ChainablePromiseElement),
    );
  }

  /**
   * Get element by XPath selector
   * @param xpath - The XPath selector to search for
   * @returns The wrapped element
   */
  static async getElementByXPath(
    xpath: string,
    options: MatcherOptions = {},
  ): Promise<PlaywrightElement> {
    const { lastElement = true, index } = options;
    this.logFind('xpath', `${xpath}${lastElement ? ' (last)' : ' (first)'}`);

    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const elements = await drv.$$(xpath);
    const length = await elements.length;
    if (length === 0) throw new Error(`No elements found for XPath: ${xpath}`);
    const element =
      index !== undefined
        ? elements[index]
        : lastElement
          ? elements[length - 1]
          : elements[0];

    return wrapElement(element);
  }

  /**
   * Get all elements matching an XPath selector.
   * Returns an empty array when no element matches — use this when the count
   * itself is the thing under test.
   * @param xpath - The XPath selector to search for
   * @returns The wrapped elements
   */
  static async getAllElementsByXPath(
    xpath: string,
  ): Promise<PlaywrightElement[]> {
    this.logFind('all elements by xpath', xpath);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const elements = await drv.$$(xpath);
    return elements.map((el) =>
      wrapElement(el as unknown as ChainablePromiseElement),
    );
  }

  /**
   * Get a lazy element reference by XPath without requiring the element to
   * exist in the DOM. Unlike getElementByXPath, this does NOT throw when the
   * element is absent — use this for negative assertions where the element may
   * never have been rendered (e.g. waitForDisplayed({ reverse: true })).
   *
   * @param xpath - The XPath selector to search for
   * @returns The wrapped element reference
   */
  static async getLazyElementByXPath(
    xpath: string,
  ): Promise<PlaywrightElement> {
    this.logFind('lazy xpath', xpath);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(xpath);
    return wrapElement(element as unknown as ChainablePromiseElement);
  }

  /**
   * Get element by class name
   * @param className - The class name to search for
   * @returns The wrapped element
   */
  static async getElementByClassName(
    className: string,
  ): Promise<PlaywrightElement> {
    this.logFind('class name', className);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`.${className}`);
    return wrapElement(element);
  }

  /**
   * Get multiple elements by class name
   * @param className - The class name to search for
   * @returns The wrapped elements
   */
  static async getAllElementsByClassName(
    className: string,
  ): Promise<PlaywrightElement[]> {
    this.logFind('all elements by class name', className);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const elements = await drv.$$(`.${className}`);
    return elements.map((el) =>
      wrapElement(el as unknown as ChainablePromiseElement),
    );
  }

  /**
   * Get element by Android UIAutomator selector
   * Only works on Android
   * TODO: Add support for list reverse like Xpath does as a best effort with
   * the possibility to override
   * @param selector - The Android UIAutomator selector to search for
   * @returns The wrapped element
   */
  static async getElementByAndroidUIAutomator(
    selector: string,
    options: MatcherOptions = {},
  ): Promise<PlaywrightElement> {
    this.logFind('android uiautomator', selector);
    const baseUiAutomatorSelector = 'android=new UiSelector()';
    const instanceSuffix =
      options.index !== undefined ? `.instance(${options.index})` : '';
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(
      `${baseUiAutomatorSelector}${selector}${instanceSuffix}`,
    );
    return wrapElement(element);
  }

  // iOS specific selectors
  /**
   * Get element by iOS predicate string
   * Only works on iOS
   * @param predicate - The iOS predicate to search for
   * @returns The wrapped element
   */
  static async getElementByIOSPredicate(
    predicate: string,
  ): Promise<PlaywrightElement> {
    this.logFind('ios predicate', predicate);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`-ios predicate string:${predicate}`);
    return wrapElement(element);
  }

  /**
   * Get element by name on iOS
   * @param name - The name to search for
   * @param lazy - Whether to get a lazy element. Lazy elements are not required to be present in the DOM. This is useful for negative assertions where the element may never have been rendered (e.g. waitForDisplayed({ reverse: true })).
   * @returns The wrapped element
   */
  static async getElementByNameiOS(
    name: string,
    lazy = false,
  ): Promise<PlaywrightElement> {
    this.logFind('ios name', `${name}${lazy ? ' (lazy)' : ''}`);
    const isIOS = await PlatformDetector.isIOS();
    if (!isIOS) throw new Error('This function is only valid for iOS');
    const xpath = `//*[contains(@name,'${name}')]`;
    if (lazy) {
      return await this.getLazyElementByXPath(xpath);
    }
    return await this.getElementByXPath(xpath);
  }

  /**
   * Get element by iOS class chain
   * Only works on iOS
   * @param chain - The iOS class chain to search for
   * @returns The wrapped element
   */
  static async getElementByIOSClassChain(
    chain: string,
  ): Promise<PlaywrightElement> {
    this.logFind('ios class chain', chain);
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`-ios class chain:${chain}`);
    return wrapElement(element);
  }
}
