import { ChainablePromiseElement } from 'webdriverio';
import { boxedStep } from './Utilities';
import { createLogger, type Logger } from './logger';
import { GestureOptions } from './types';

/**
 * PlaywrightAdapter - Provides Playwright-like API on top of WebdriverIO elems
 *
 * This adapter gives you the clean Playwright syntax while leveraging WebdriverIO's
 * robust elem finding, retry mechanisms, and mobile automation capabilities.
 *
 * @example
 * const elem = await PlaywrightAdapter.wrap(driver.$('~username'));
 * await elem.fill('myusername');
 * await elem.click();
 * const text = await elem.textContent();
 */
export class PlaywrightElement {
  private elem: ChainablePromiseElement;
  private logger: Logger;

  constructor(elem: ChainablePromiseElement) {
    this.elem = elem;
    this.logger = createLogger({ name: 'PlaywrightElement' });
  }

  /**
   * Fill an input elem with text
   * @param value - The value to fill the input with
   * @param options - Options including isSensitive to mask logging
   */
  @boxedStep
  async fill(
    value: string,
    options: GestureOptions & { isSensitive?: boolean } = {
      elemDescription: 'input',
      isSensitive: false,
    },
  ): Promise<void> {
    this.logger.debug(
      `Filling input with value: ${options.isSensitive ? '***' : value}`,
    );
    await this.elem.setValue(value);
  }

  /**
   * Click an elem
   * @param options - Options including elemDescription for logging
   */
  @boxedStep
  async click(options: GestureOptions = {}): Promise<void> {
    this.logger.debug(
      `Clicking element: ${options.elemDescription || this.elem.selector}`,
    );
    await this.elem.click();
  }

  /**
   * Get the text content of the elem
   */
  @boxedStep
  async textContent(options: GestureOptions = {}): Promise<string> {
    this.logger.debug(
      `Getting text content of element: ${options.elemDescription || this.elem.selector}`,
    );
    return await this.elem.getText();
  }

  /**
   * Check if elem is visible (Playwright-style)
   * Maps to WebdriverIO's isDisplayed()
   */
  @boxedStep
  async isVisible(options: GestureOptions = {}): Promise<boolean> {
    this.logger.debug(
      `Checking if element is visible: ${options.elemDescription || this.elem.selector}`,
    );
    return await this.elem.isDisplayed();
  }

  /**
   * Check if elem is enabled (Playwright-style)
   * Maps to WebdriverIO's isEnabled()
   */
  @boxedStep
  async isEnabled(options: GestureOptions = {}): Promise<boolean> {
    this.logger.debug(
      `Checking if element is enabled: ${options.elemDescription || this.elem.selector}`,
    );
    return await this.elem.isEnabled();
  }

  /**
   * Get attribute value (Playwright-style)
   * Maps to WebdriverIO's getAttribute()
   * @param name - The name of the attribute to get
   * @returns The value of the attribute or null if the attribute does not exist
   */
  @boxedStep
  async getAttribute(
    name: string,
    options: GestureOptions = {},
  ): Promise<string | null> {
    this.logger.debug(
      `Getting attribute value of element: ${options.elemDescription || this.elem.selector}`,
    );
    return await this.elem.getAttribute(name);
  }

  /**
   * Type text with a delay between keystrokes
   * @param text - The text to type
   */
  @boxedStep
  async type(text: string, options: GestureOptions = {}): Promise<void> {
    this.logger.debug(
      `Typing text into element: ${options.elemDescription || this.elem.selector}`,
    );
    await this.elem.addValue(text);
  }

  /**
   * Clear the input elem (Playwright-style)
   * Maps to WebdriverIO's clearValue()
   */
  @boxedStep
  async clear(options: GestureOptions = {}): Promise<void> {
    this.logger.debug(
      `Clearing element: ${options.elemDescription || this.elem.selector}`,
    );
    await this.elem.clearValue();
  }

  /**
   * Wait for elem to be displayed
   */
  @boxedStep
  async waitForDisplayed(
    options: GestureOptions & {
      reverse?: boolean;
    } = {},
  ): Promise<void> {
    this.logger.debug(
      `Waiting for element to be displayed: ${options.elemDescription || this.elem.selector}`,
    );
    await this.elem.waitForDisplayed(options);
  }

  /**
   * Wait for elem to be enabled
   */
  @boxedStep
  async waitForEnabled(
    options: GestureOptions & {
      reverse?: boolean;
    } = {},
  ): Promise<void> {
    this.logger.debug(
      `Waiting for element to be enabled: ${options.elemDescription || this.elem.selector}`,
    );
    await this.elem.waitForEnabled(options);
  }

  /**
   * Tap on element at coordinates (mobile-specific, Playwright-style)
   * Maps to WebdriverIO's touchAction() - tap at element center
   * Note: Use click() if touchAction has compatibility issues
   */
  @boxedStep
  async tapOnCoordinates(
    { x, y }: { x: number; y: number },
    options: GestureOptions = {},
  ): Promise<void> {
    this.logger.debug(
      `Tapping on coordinates: ${x}, ${y} for element: ${options.elemDescription || this.elem.selector}`,
    );
    // Use WebdriverIO's touch action to tap at coordinates
    await this.elem.touchAction([
      {
        action: 'tap',
        x,
        y,
      },
    ]);
  }

  /**
   * Get the underlying WebdriverIO elem
   * Use this when you need direct access to WebdriverIO methods
   */
  unwrap(): ChainablePromiseElement {
    return this.elem;
  }
}

/**
 * Wrap a WebdriverIO elem with Playwright-like API
 * Intentionally shadows global $ to provide Playwright-style syntax
 * @param selector - The selector to wrap
 * @returns The wrapped element
 */
// eslint-disable-next-line @typescript-eslint/no-shadow
export async function $(selector: string): Promise<PlaywrightElement> {
  const drv = globalThis.driver;
  if (!drv) throw new Error('Driver is not available');
  const elem = await drv.$(selector);
  return new PlaywrightElement(elem);
}

/**
 * Wrap multiple WebdriverIO elems with Playwright-like API
 * Intentionally shadows global $ to provide Playwright-style syntax
 * @param selector - The selector to wrap
 * @returns The wrapped elements
 */
// eslint-disable-next-line @typescript-eslint/no-shadow
export async function $$(selector: string): Promise<PlaywrightElement[]> {
  const drv = globalThis.driver;
  if (!drv) throw new Error('Driver is not available');
  const elems = await drv.$$(selector);
  return elems.map(
    (el) => new PlaywrightElement(el as unknown as ChainablePromiseElement),
  );
}

/**
 * Static helper to wrap an existing WebdriverIO elem
 */
export function wrapElement(elem: ChainablePromiseElement): PlaywrightElement {
  return new PlaywrightElement(elem);
}
