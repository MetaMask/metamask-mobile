import { PlaywrightElement } from './PlaywrightAdapter';

/**
 * PlaywrightGestures - Gesture helpers for WebdriverIO/Playwright
 *
 * This class provides gesture methods that wrap PlaywrightElement API.
 * Currently these are simple wrappers, but can be enhanced with retries,
 * stability checks, and logging in the future (similar to Detox Gestures).
 *
 * @example
 * const elem = await PlaywrightMatchers.getByXPath('...');
 * await PlaywrightGestures.tap(elem);
 * await PlaywrightGestures.fill(elem, 'text');
 */
export default class PlaywrightGestures {
  /**
   * Tap/click an element
   */
  static async tap(elem: PlaywrightElement): Promise<void> {
    await elem.click();
  }

  /**
   * Click an element (alias for tap)
   */
  static async click(elem: PlaywrightElement): Promise<void> {
    await elem.click();
  }

  /**
   * Fill an input element (replaces existing text)
   */
  static async fill(elem: PlaywrightElement, text: string): Promise<void> {
    await elem.fill(text);
  }

  /**
   * Type text character by character
   */
  static async type(elem: PlaywrightElement, text: string): Promise<void> {
    await elem.type(text);
  }

  /**
   * Clear text from an input element
   */
  static async clear(elem: PlaywrightElement): Promise<void> {
    await elem.clear();
  }

  /**
   * Get text content from an element
   */
  static async getText(elem: PlaywrightElement): Promise<string> {
    return await elem.textContent();
  }

  /**
   * Check if element is visible
   */
  static async isVisible(elem: PlaywrightElement): Promise<boolean> {
    return await elem.isVisible();
  }

  /**
   * Check if element is enabled
   */
  static async isEnabled(elem: PlaywrightElement): Promise<boolean> {
    return await elem.isEnabled();
  }

  /**
   * Wait for element to be displayed
   */
  static async waitForDisplayed(
    elem: PlaywrightElement,
    options?: { timeout?: number; reverse?: boolean },
  ): Promise<void> {
    await elem.waitForDisplayed(options);
  }

  /**
   * Wait for element to be enabled
   */
  static async waitForEnabled(
    elem: PlaywrightElement,
    options?: { timeout?: number; reverse?: boolean },
  ): Promise<void> {
    await elem.waitForEnabled(options);
  }

  /**
   * Get attribute value from element
   */
  static async getAttribute(
    elem: PlaywrightElement,
    name: string,
  ): Promise<string | null> {
    return await elem.getAttribute(name);
  }

  /**
   * Swipe element in a direction
   */
  static async swipe(
    elem: PlaywrightElement,
    direction: 'up' | 'down' | 'left' | 'right',
    speed: 'fast' | 'slow' = 'fast',
  ): Promise<void> {
    const location = await elem.unwrap().getLocation();
    const size = await elem.unwrap().getSize();

    const startX = location.x + size.width / 2;
    const startY = location.y + size.height / 2;

    let endX = startX;
    let endY = startY;

    const distance = 200; // pixels

    switch (direction) {
      case 'up':
        endY -= distance;
        break;
      case 'down':
        endY += distance;
        break;
      case 'left':
        endX -= distance;
        break;
      case 'right':
        endX += distance;
        break;
    }

    await elem
      .unwrap()
      .touchAction([
        { action: 'press', x: startX, y: startY },
        { action: 'wait', ms: speed === 'slow' ? 1000 : 100 },
        { action: 'moveTo', x: endX, y: endY },
        'release',
      ]);
  }

  /**
   * Long press an element
   */
  static async longPress(
    elem: PlaywrightElement,
    duration = 1000,
  ): Promise<void> {
    const location = await elem.unwrap().getLocation();
    const size = await elem.unwrap().getSize();

    const x = location.x + size.width / 2;
    const y = location.y + size.height / 2;

    await elem
      .unwrap()
      .touchAction([
        { action: 'press', x, y },
        { action: 'wait', ms: duration },
        'release',
      ]);
  }

  /**
   * Scroll element into view
   */
  static async scrollIntoView(elem: PlaywrightElement): Promise<void> {
    await elem.unwrap().scrollIntoView();
  }
}
