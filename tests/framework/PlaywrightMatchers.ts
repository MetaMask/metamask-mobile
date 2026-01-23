import { PlaywrightElement, wrapElement } from './PlaywrightAdapter.ts';
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
  static async getByAccessibilityId(
    elementId: string,
  ): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`~${elementId}`);
    return wrapElement(element);
  }

  /**
   * Get element by ID (Android resource-id or iOS accessibility identifier)
   * @param elementId - The ID of the element
   * @returns The wrapped element
   */
  static async getById(elementId: string): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(elementId);
    return wrapElement(element);
  }

  /**
   * Get element by text content (cross-platform)
   * @param text - The text to search for
   * @returns The wrapped element
   */
  static async getByText(text: string): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`*.=${text}`);
    return wrapElement(element);
  }

  /**
   * Get multiple elements by text content
   * @param text - The text to search for
   * @returns The wrapped elements
   */
  static async getAllByText(text: string): Promise<PlaywrightElement[]> {
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
  static async getByXPath(xpath: string): Promise<PlaywrightElement> {
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
  static async getByClassName(className: string): Promise<PlaywrightElement> {
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
  static async getAllByClassName(
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
  static async getByAndroidUIAutomator(
    selector: string,
  ): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`android=${selector}`);
    return wrapElement(element);
  }

  /**
   * Get element by iOS predicate string
   * Only works on iOS
   * @param predicate - The iOS predicate to search for
   * @returns The wrapped element
   */
  static async getByIOSPredicate(
    predicate: string,
  ): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`-ios predicate string:${predicate}`);
    return wrapElement(element);
  }

  /**
   * Get element by iOS class chain
   * Only works on iOS
   * @param chain - The iOS class chain to search for
   * @returns The wrapped element
   */
  static async getByIOSClassChain(chain: string): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`-ios class chain:${chain}`);
    return wrapElement(element);
  }
}
