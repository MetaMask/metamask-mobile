import { getDriver } from './AppiumUtilities.ts';
import { createAppiumLogger } from './appiumLogger.ts';

const logger = createAppiumLogger('IosWebViewTap');

/**
 * Appium's iOS remote-debugger `element/click` atom reads `globalThis.self`.
 * LavaMoat scuttling makes that property inaccessible.
 * @see https://github.com/LavaMoat/LavaMoat/issues/2127
 */
const LAVAMOAT_SCUTTLING_PATTERN = /LavaMoat|scuttling/i;

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return '';
}

/**
 * True when an Appium WebView command failed because LavaMoat scuttling blocked
 * the remote-debugger script (find or click atoms can both hit this).
 *
 * @param error - Rejection from an Appium WebView command.
 * @returns Whether the error is LavaMoat scuttling.
 */
export function isLavaMoatScuttlingError(error: unknown): boolean {
  return LAVAMOAT_SCUTTLING_PATTERN.test(readErrorMessage(error));
}

/**
 * Click an element by HTML id in the current WebView context.
 *
 * Uses `driver.execute`, which this suite already uses to read the same page.
 * That path does not run the remote-debugger `element` / `element/click` atoms
 * that touch scuttled `globalThis` properties (`navigator`, `self`, …).
 *
 * @param webId - HTML id of the control to click.
 */
export async function clickWebIdViaDom(webId: string): Promise<void> {
  const clicked = await getDriver().execute(`return (() => {
    const el = document.getElementById(${JSON.stringify(webId)});
    if (!el || typeof el.click !== 'function') {
      return false;
    }
    el.click();
    return true;
  })()`);

  if (clicked !== true) {
    throw new Error(`WebView element #${webId} not found for DOM click`);
  }
}

/**
 * Run a WebView action; on LavaMoat scuttling, click `#webId` via page script.
 *
 * Covers find (`element`) and click (`element/click`) failures — both can hit
 * scuttling under LavaMoat (e.g. `navigator` / `self` inaccessible).
 *
 * @param webId - HTML id used for the DOM-click fallback.
 * @param action - Appium WebView find/scroll/tap (or click-only) path.
 * @param failureContext - Short label for debug logs (`find/tap`, `click`, …).
 */
export async function runRecoveringFromLavaMoatScuttling(
  webId: string,
  action: () => Promise<void>,
  failureContext = 'action',
): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (!isLavaMoatScuttlingError(error)) {
      throw error;
    }

    logger.debug(
      `Appium WebView ${failureContext} hit LavaMoat scuttling for #${webId}; clicking via page script`,
    );
    await clickWebIdViaDom(webId);
  }
}

/**
 * Tap a WebView control. When Appium's element click is blocked by LavaMoat
 * scuttling, click the same HTML id from page script.
 *
 * @param webId - HTML id of the control.
 * @param tap - Appium element click for that control.
 */
export async function tapWebIdFallingBackToDomClick(
  webId: string,
  tap: () => Promise<void>,
): Promise<void> {
  await runRecoveringFromLavaMoatScuttling(webId, tap, 'click');
}
