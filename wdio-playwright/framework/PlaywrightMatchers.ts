import { PlaywrightElement, wrapElement } from './PlaywrightAdapter';
import { getDriver } from '../utils';
import { ChainablePromiseElement } from 'webdriverio';

/**
 * PlaywrightMatchers - Element selectors that return Playwright-like wrapped elements
 *
 * These matchers use WebdriverIO's robust element finding under the hood,
 * but return elements with Playwright-style API (fill, click, textContent, etc.)
 */
export default class PlaywrightMatchers {
  /**
   * Get element by accessibility ID (iOS) or content-desc/resource-id (Android)
   * This is the most common selector for mobile apps
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
   */
  static async getById(elementId: string): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(elementId);
    return wrapElement(element);
  }

  /**
   * Get element by text content
   */
  static async getByText(text: string): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element2 = await drv.$(`android=new UiSelector().text("${text}")`);
    return wrapElement(element2);
  }

  /**
   * Get multiple elements by text content
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
   */
  static async getByXPath(xpath: string): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(xpath);
    return wrapElement(element);
  }

  /**
   * Get element by class name
   */
  static async getByClass(className: string): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`.${className}`);
    return wrapElement(element);
  }

  /**
   * Get element by Android UIAutomator selector
   * Only works on Android
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
   */
  static async getByIOSClassChain(chain: string): Promise<PlaywrightElement> {
    const drv = getDriver();
    if (!drv) throw new Error('Driver is not available');
    const element = await drv.$(`-ios class chain:${chain}`);
    return wrapElement(element);
  }
}
