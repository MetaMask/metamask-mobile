import { PlaywrightElement } from './PlaywrightAdapter';
import { boxedStep } from './Utilities';

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
   * Swipe element in a direction
   */
  @boxedStep
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
  @boxedStep
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
  @boxedStep
  static async scrollIntoView(elem: PlaywrightElement): Promise<void> {
    await elem.unwrap().scrollIntoView();
  }
}
