import { ChainablePromiseElement } from 'webdriverio';

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
   * Fill an input elem with text (Playwright-style)
   * Maps to WebdriverIO's setValue()
   */
  async fill(value: string): Promise<void> {
    await this.elem.setValue(value);
  }

  /**
   * Click an elem (Playwright-style)
   * Maps to WebdriverIO's click()
   */
  async click(): Promise<void> {
    await this.elem.click();
  }

  /**
   * Get the text content of an elem (Playwright-style)
   * Maps to WebdriverIO's getText()
   */
  async textContent(): Promise<string> {
    return await this.elem.getText();
  }

  /**
   * Check if elem is visible (Playwright-style)
   * Maps to WebdriverIO's isDisplayed()
   */
  async isVisible(): Promise<boolean> {
    return await this.elem.isDisplayed();
  }

  /**
   * Check if elem is enabled (Playwright-style)
   * Maps to WebdriverIO's isEnabled()
   */
  async isEnabled(): Promise<boolean> {
    return await this.elem.isEnabled();
  }

  /**
   * Get attribute value (Playwright-style)
   * Maps to WebdriverIO's getAttribute()
   */
  async getAttribute(name: string): Promise<string | null> {
    return await this.elem.getAttribute(name);
  }

  /**
   * Type text with a delay between keystrokes (Playwright-style)
   * Maps to WebdriverIO's addValue()
   */
  async type(text: string): Promise<void> {
    await this.elem.addValue(text);
  }

  /**
   * Clear the input elem (Playwright-style)
   * Maps to WebdriverIO's clearValue()
   */
  async clear(): Promise<void> {
    await this.elem.clearValue();
  }

  /**
   * Wait for elem to be displayed
   */
  async waitForDisplayed(options?: {
    timeout?: number;
    reverse?: boolean;
  }): Promise<void> {
    await this.elem.waitForDisplayed(options);
  }

  /**
   * Wait for elem to be enabled
   */
  async waitForEnabled(options?: {
    timeout?: number;
    reverse?: boolean;
  }): Promise<void> {
    await this.elem.waitForEnabled(options);
  }

  /**
   * Tap on elem (mobile-specific, Playwright-style)
   * Maps to WebdriverIO's touchAction()
   */
  async tap(): Promise<void> {
    const location = await this.elem.getLocation();
    const size = await this.elem.getSize();
    const x = location.x + size.width / 2;
    const y = location.y + size.height / 2;

    // Use WebdriverIO's touch action
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
