import Assertions from '../Assertions.ts';
import Gestures from '../Gestures.ts';
import { getDriver, withImplicitWait } from '../AppiumUtilities.ts';
import { sleep } from '../Utilities.ts';
import { getElementForLocator } from '../ai-locator/SelfHealingLocator.ts';
import { parseScreenNodes, screenSignature, textInBox } from './screen.ts';
import { keyboardOpen, systemKeyboardShown, typeText } from './typing.ts';
import type { Device, Locator } from './types.ts';

export const PAGE_SOURCE_LIMIT = 40_000;
const ACTION_TIMEOUT_MS = 5_000;
const EXPECT_TIMEOUT_MS = 15_000;

const pageNodes = async () =>
  parseScreenNodes(await getDriver().getPageSource());

/** All visible text inside an element's bounds, from one page source. */
async function textWithin(locator: Locator): Promise<string> {
  const native = await (await getElementForLocator(locator)).unwrap();
  const { x, y } = await native.getLocation();
  const { width, height } = await native.getSize();
  return textInBox(await pageNodes(), [x, y, x + width, y + height]);
}

/** A finger drag across the middle of the screen. "up" moves the finger up, which reveals content further down a list. */
async function swipe(direction: 'up' | 'down'): Promise<void> {
  const drv = getDriver();
  const { width, height } = await drv.getWindowSize();
  const [from, to] = direction === 'up' ? [0.7, 0.3] : [0.3, 0.7];
  const x = Math.round(width / 2);
  await drv
    .action('pointer', { parameters: { pointerType: 'touch' } })
    .move({ x, y: Math.round(height * from) })
    .down()
    .pause(100)
    .move({ duration: 400, x, y: Math.round(height * to) })
    .up()
    .perform();
}

/** The coordinate drag Gestures.scrollWithinContainer uses: no hold, 600 ms. */
async function dragLikePageObjects(direction: 'up' | 'down'): Promise<void> {
  const { width, height } = await getDriver().getWindowSize();
  const [from, to] = direction === 'up' ? [0.75, 0.35] : [0.35, 0.75];
  const x = Math.round(width / 2);
  await Gestures.swipeScreen({
    scrollParams: { direction },
    duration: 600,
    from: { x, y: Math.round(height * from) },
    to: { x, y: Math.round(height * to) },
  });
}

export const appiumDevice: Device = {
  async observe() {
    const appium = getDriver();
    return {
      pageSource: (await appium.getPageSource()).slice(0, PAGE_SOURCE_LIMIT),
      screenshot: Buffer.from(await appium.takeScreenshot(), 'base64'),
    };
  },
  /** Some amount fields keep their text in a child. */
  async fieldText(locator) {
    const own = (
      (await (await getElementForLocator(locator)).textContent()) ?? ''
    ).trim();
    return own || (await textWithin(locator)).trim();
  },
  async perform(action, hooks) {
    switch (action.type) {
      case 'tap':
        return Gestures.waitAndTap(getElementForLocator(action.locator), {
          timeout: ACTION_TIMEOUT_MS,
          elemDescription: action.locator.value,
        });
      case 'type':
        return typeText(action.locator, action.text, hooks);
      case 'swipe': {
        // Some lists (the account hub) ignore the first drag; if nothing
        // moved, drag again the way the Page Objects do.
        const before = screenSignature(await pageNodes());
        await swipe(action.direction);
        await sleep(400);
        if (screenSignature(await pageNodes()) === before)
          await dragLikePageObjects(action.direction);
        return;
      }
      case 'dismissKeyboard':
        // A person closes the system keyboard with its own control (back).
        if (await systemKeyboardShown()) return Gestures.hideKeyboard();
        if (!action.locator) {
          throw new Error(
            'an in-app keypad is closed by tapping a visible element; give its locator',
          );
        }
        return Gestures.waitAndTap(getElementForLocator(action.locator), {
          timeout: ACTION_TIMEOUT_MS,
          checkForDisplayed: true,
          checkEnabled: false,
          elemDescription: `dismiss keyboard via ${action.locator.value}`,
        });
      case 'expect':
        return appiumDevice.waitFor(
          action.locator,
          EXPECT_TIMEOUT_MS,
          action.textPattern,
          true,
        );
    }
  },
  keyboardOpen,
  pageSource: () => getDriver().getPageSource(),
  async describe(locator) {
    const own = (
      (await (await getElementForLocator(locator)).textContent()) ?? ''
    ).trim();
    // Not resolvable for text reading: the tap itself will report it.
    const inside = await textWithin(locator).catch(() => '');
    return `${own} ${inside}`.trim();
  },
  async waitFor(locator, timeout, textPattern, deep = false) {
    if (!textPattern) {
      return Assertions.expectElementToBeVisible(
        getElementForLocator(locator),
        { timeout, description: `${locator.strategy}=${locator.value}` },
      );
    }
    // Same polling as QuoteView.waitForQuoteReady: read the text until it matches.
    const pattern = new RegExp(textPattern);
    const start = Date.now();
    let lastSeen = '<element not found>';
    while (Date.now() - start < timeout) {
      try {
        lastSeen = await (await getElementForLocator(locator)).textContent();
        if (pattern.test(lastSeen ?? '')) return;
        if (deep) {
          lastSeen = await textWithin(locator);
          if (pattern.test(lastSeen)) return;
        }
      } catch {
        lastSeen = '<element not found>';
      }
      await sleep(300);
    }
    throw new Error(
      `${locator.strategy}=${locator.value} text did not match /${textPattern}/ after ${timeout}ms, got: "${lastSeen}"`,
    );
  },
  isVisibleNow: (locator, textPattern) =>
    withImplicitWait(0, async () => {
      try {
        const element = await getElementForLocator(locator);
        if (!(await element.unwrap().isDisplayed())) return false;
        return textPattern
          ? new RegExp(textPattern).test((await element.textContent()) ?? '')
          : true;
      } catch {
        return false;
      }
    }),
};
