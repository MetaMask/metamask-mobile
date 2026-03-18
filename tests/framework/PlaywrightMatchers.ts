import { PlatformDetector } from './PlatformLocator';
import { PlaywrightElement, wrapElement } from './PlaywrightAdapter';
import { MatcherOptions } from './types.ts';
import { getDriver } from './Utilities.ts';
import { ChainablePromiseElement } from 'webdriverio';

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
  /**
   * Get element by accessibility ID (iOS) or content-desc/resource-id (Android)
   * This is the most common selector for mobile apps
   *
   * @param elementId - The accessibility ID or content-desc/resource-id of the element
   * @returns The wrapped element
   */
  static async getElementByAccessibilityId(
    elementId: string,
  ): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
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
    elementId: string,
    options: MatcherOptions = {},
  ): Promise<PlaywrightElement> {
    const { exact = false } = options;

    let locator: string;
    const isAndroid = await PlatformDetector.isAndroid();
    if (isAndroid) {
      locator = 'android=new UiSelector()';
      locator = exact
        ? `${locator}.resourceId('${elementId}')`
        : `${locator}.resourceIdMatches('.*${elementId}.*')`;
    } else {
      locator = '-ios predicate string:';
      locator = exact
        ? `${locator}name == '${elementId}'`
        : `${locator}name CONTAINS '${elementId}'`;
    }

    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(locator);
    return wrapElement(element);
  }

  /**
   * Get element by text content (cross-platform)
   * @param text - The text to search for
   * @returns The wrapped element
   */
  static async getElementByText(text: string): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`*.=${text}`);
    return wrapElement(element);
  }

  /**
   * Get element by catch-all selector that works on both platforms
   * @param identifier - The identifier to search for
   * @returns The wrapped element
   */
  static async getElementByCatchAll(
    identifier: string,
  ): Promise<PlaywrightElement> {
    const isAndroid = await PlatformDetector.isAndroid();
    let xpath = '';
    if (isAndroid) {
      xpath = `//*[@resource-id='${identifier}' or contains(@text,'${identifier}') or contains(@content-desc,'${identifier}')]`;
    } else {
      xpath = `//*[contains(@name,'${identifier}') or contains(@label,'${identifier}') or contains(@text,'${identifier}')]`;
    }
    return await this.getElementByXPath(xpath);
  }

  /**
   * Get multiple elements by text content
   * @param text - The text to search for
   * @returns The wrapped elements
   */
  static async getAllElementsByText(
    text: string,
  ): Promise<PlaywrightElement[]> {
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
  static async getElementByXPath(xpath: string): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(xpath);
    return wrapElement(element);
  }

  /**
   * Get element by class name
   * @param className - The class name to search for
   * @returns The wrapped element
   */
  static async getElementByClassName(
    className: string,
  ): Promise<PlaywrightElement> {
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
   * @param selector - The Android UIAutomator selector to search for
   * @returns The wrapped element
   */
  static async getElementByAndroidUIAutomator(
    selector: string,
  ): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`android=${selector}`);
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
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`-ios predicate string:${predicate}`);
    return wrapElement(element);
  }

  /**
   * Get element by name on iOS
   * @param name - The name to search for
   * @returns The wrapped element
   */
  static async getElementByNameiOS(name: string): Promise<PlaywrightElement> {
    const isIOS = await PlatformDetector.isIOS();
    if (!isIOS) throw new Error('This function is only valid for iOS');
    const xpath = `//*[contains(@name,'${name}')]`;
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
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`-ios class chain:${chain}`);
    return wrapElement(element);
  }
}
