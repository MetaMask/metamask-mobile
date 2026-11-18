import Gestures from '../Gestures.ts';
import { getDriver } from '../AppiumUtilities.ts';
import { sleep } from '../Utilities.ts';
import { getElementForLocator } from '../ai-locator/SelfHealingLocator.ts';
import { fieldTextIn, parseScreenNodes, type ScreenNode } from './screen.ts';
import type { Locator, Point, TypingHooks } from './types.ts';

/** Longest wait for a keyboard to appear after the tap on a field. */
const KEYBOARD_DISCOVERY_MS = 3_000;
/** Burst taps: finger down for this long, then this gap before the next key. */
const BURST_PRESS_MS = 40;
const BURST_GAP_MS = 100;

export const systemKeyboardShown = (): Promise<boolean> =>
  Gestures.isKeyboardShown().catch(() => false);

let windowHeight: number | undefined;
async function screenHeight(): Promise<number> {
  windowHeight ??= (await getDriver().getWindowSize()).height;
  return windowHeight;
}

/**
 * The on-screen key a person would press for `char`: the keypad-key-* id,
 * then its visible text, then its content-desc. Only the lower part of the
 * screen counts (where keypads sit) and the lowest match wins, so a "0" in
 * an amount field is never used.
 */
function findKey(
  nodes: ScreenNode[],
  char: string,
  height: number,
): ScreenNode | undefined {
  const id = char === '.' ? 'keypad-key-dot' : `keypad-key-${char}`;
  const lower = nodes.filter((n) => n.top >= height * 0.4);
  const lowest = (test: (n: ScreenNode) => boolean) =>
    lower.filter(test).sort((a, b) => b.top - a.top)[0];
  return (
    lower.find((n) => n.id === id) ??
    lowest((n) => n.text === char) ??
    lowest((n) => n.desc === char)
  );
}

/** True while the system keyboard or an in-app keypad is on screen. */
export async function keyboardOpen(): Promise<boolean> {
  if (await systemKeyboardShown()) return true;
  const nodes = parseScreenNodes(await getDriver().getPageSource());
  const height = await screenHeight();
  return Boolean(findKey(nodes, '1', height) && findKey(nodes, '9', height));
}

/**
 * Where to tap, all from one page source: delete presses that clear the
 * field, then one press per character. Null when a key the text needs is
 * not on screen (the keypad has not opened yet).
 */
export function planBurst(
  nodes: ScreenNode[],
  text: string,
  field: Locator,
  height: number,
): { clear: Point[]; keys: Point[] } | null {
  const keys: Point[] = [];
  for (const char of text) {
    const key = findKey(nodes, char, height);
    if (!key) return null;
    keys.push(key.center);
  }
  const shown = fieldTextIn(nodes, field) ?? '';
  if (shown === '' || shown === '0') return { clear: [], keys };
  const del =
    nodes.find((n) => n.id === 'keypad-delete-button') ??
    nodes.find((n) => /delete|backspace/i.test(n.desc));
  return del ? { clear: Array(shown.length).fill(del.center), keys } : null;
}

/** One W3C touch sequence for all taps: one request instead of one per key. */
export function burstActions(points: Point[]): Record<string, unknown>[] {
  return points.flatMap((point, i) => [
    ...(i > 0 ? [{ type: 'pause', duration: BURST_GAP_MS }] : []),
    { type: 'pointerMove', duration: 0, x: point.x, y: point.y },
    { type: 'pointerDown', button: 0 },
    { type: 'pause', duration: BURST_PRESS_MS },
    { type: 'pointerUp', button: 0 },
  ]);
}

async function tapBurst(points: Point[]): Promise<void> {
  if (points.length === 0) return;
  // Every sequence ends with pointerUp, so no releaseActions round trip.
  await getDriver().performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: burstActions(points),
    },
  ]);
}

/**
 * Enters text the way a person does: tap the field, then press the keys of
 * whichever keyboard appears, polling one page source at a time. The in-app
 * keypad gets every key centre from one page source and one touch sequence,
 * so the pace is the same every run. Values are never injected into the
 * element; the read-back happens in ScenarioAgent after any timer window.
 */
export async function typeText(
  locator: Locator,
  text: string,
  hooks: TypingHooks = {},
): Promise<void> {
  const startedAt = Date.now();
  await (await getElementForLocator(locator)).unwrap().click();
  const height = await screenHeight();
  for (;;) {
    if (await systemKeyboardShown()) {
      await hooks.beforeKeys?.();
      await getDriver().keys(text.split(''));
      console.log(
        `[scenario-agent] Typed "${text}" via system keyboard in ${Date.now() - startedAt} ms`,
      );
      if (hooks.afterLastKey) await hooks.afterLastKey();
      // Closed as a person (and the page objects) would, so it does not
      // cover the next button. Kept out of timed windows.
      else if (await systemKeyboardShown()) await Gestures.hideKeyboard();
      return;
    }
    const nodes = parseScreenNodes(await getDriver().getPageSource());
    const plan = planBurst(nodes, text, locator, height);
    if (plan) {
      if (hooks.beforeKeys) {
        await tapBurst(plan.clear);
        await hooks.beforeKeys();
        await tapBurst(plan.keys);
      } else {
        await tapBurst([...plan.clear, ...plan.keys]);
      }
      console.log(
        `[scenario-agent] Typed "${text}" via keypad (${plan.clear.length} clear + ${plan.keys.length} key presses) in ${Date.now() - startedAt} ms`,
      );
      await hooks.afterLastKey?.();
      return;
    }
    if (Date.now() - startedAt > KEYBOARD_DISCOVERY_MS) {
      throw new Error(
        `tapped ${locator.strategy}=${locator.value}, but neither the system keyboard nor on-screen keys for "${text}" appeared`,
      );
    }
    await sleep(150);
  }
}
