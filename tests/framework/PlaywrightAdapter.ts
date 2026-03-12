import { ChainablePromiseElement } from 'webdriverio';
import { boxedStep } from './PlaywrightUtilities.ts';

export interface IsDisplayedParams {
  /**
   * `true` to check if the element is within the viewport. false by default.
   */
  withinViewport?: boolean;
  /**
   * `true` to check if the element content-visibility property has (or inherits) the value auto,
   * and it is currently skipping its rendering. `true` by default.
   * @default true
   */
  contentVisibilityAuto?: boolean;
  /**
   * `true` to check if the element opacity property has (or inherits) a value of 0. `true` by default.
   * @default true
   */
  opacityProperty?: boolean;
  /**
   * `true` to check if the element is invisible due to the value of its visibility property. `true` by default.
   * @default true
   */
  visibilityProperty?: boolean;
}

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

  constructor(elem: ChainablePromiseElement) {
    this.elem = elem;
  }

  /**
   * Fill an input elem with text
   * @param value - The value to fill the input with
   */
  @boxedStep
  async fill(value: string): Promise<void> {
    await this.elem.setValue(value);
  }

  /**
   * Click an elem
   */
  @boxedStep
  async click(): Promise<void> {
    await this.elem.click();
  }

  /**
   * Get the text content of the elem
   */
  @boxedStep
  async textContent(): Promise<string> {
    return await this.elem.getText();
  }

  /**
   * Check if elem is visible (Playwright-style)
   * Maps to WebdriverIO's isDisplayed()
   */
  @boxedStep
  async isVisible(options?: IsDisplayedParams): Promise<boolean> {
    return await this.elem.isDisplayed(options);
  }

  /**
   * Check if elem is enabled (Playwright-style)
   * Maps to WebdriverIO's isEnabled()
   */
  @boxedStep
  async isEnabled(): Promise<boolean> {
    return await this.elem.isEnabled();
  }

  /**
   * Get attribute value (Playwright-style)
   * Maps to WebdriverIO's getAttribute()
   * @param name - The name of the attribute to get
   * @returns The value of the attribute or null if the attribute does not exist
   */
  @boxedStep
  async getAttribute(name: string): Promise<string | null> {
    return await this.elem.getAttribute(name);
  }

  /**
   * Type text with a delay between keystrokes
   * @param text - The text to type
   */
  @boxedStep
  async type(text: string): Promise<void> {
    await this.elem.addValue(text);
  }

  /**
   * Clear the input elem (Playwright-style)
   * Maps to WebdriverIO's clearValue()
   */
  @boxedStep
  async clear(): Promise<void> {
    await this.elem.clearValue();
  }

  /**
   * Wait for elem to be displayed
   * Note: This will throw if the element is not displayed within the timeout.
   * @param options - The options to pass to the waitForDisplayed method.
   * @param options.timeout - The timeout in milliseconds.
   * @returns The result of the waitForDisplayed method.
   */
  @boxedStep
  async waitForDisplayed(options?: {
    timeout?: number;
    interval?: number;
    timeoutMsg?: string;
    withinViewport?: boolean;
    contentVisibilityAuto?: boolean;
    opacityProperty?: boolean;
    visibilityProperty?: boolean;
  }): Promise<void> {
    await this.elem.waitForDisplayed(options);
  }

  /**
   * Wait for elem to be enabled
   */
  @boxedStep
  async waitForEnabled(options?: {
    timeout?: number;
    reverse?: boolean;
    interval?: number;
    timeoutMsg?: string;
  }): Promise<void> {
    await this.elem.waitForEnabled(options);
  }

  /**
   * Tap on element at coordinates (mobile-specific, Playwright-style)
   * Maps to WebdriverIO's touchAction() - tap at element center
   * Note: Use click() if touchAction has compatibility issues
   */
  @boxedStep
  async tapOnCoordinates({ x, y }: { x: number; y: number }): Promise<void> {
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
