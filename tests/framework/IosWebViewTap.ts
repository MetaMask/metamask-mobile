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
 * the remote-debugger script.
 *
 * @param error - Rejection from an Appium WebView command.
 * @returns Whether the error is LavaMoat scuttling.
 */
function isLavaMoatScuttlingError(error: unknown): boolean {
  return LAVAMOAT_SCUTTLING_PATTERN.test(readErrorMessage(error));
}

/**
 * Click an element by HTML id in the current WebView context.
 *
 * Uses `driver.execute`, which this suite already uses to read the same page.
 * That path does not run the `element/click` atom that touches `globalThis.self`.
 *
 * @param webId - HTML id of the control to click.
 */
async function clickWebIdViaDom(webId: string): Promise<void> {
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
  try {
    await tap();
  } catch (error) {
    if (!isLavaMoatScuttlingError(error)) {
      throw error;
    }

    logger.debug(
      `Appium WebView click hit LavaMoat scuttling for #${webId}; clicking via page script`,
    );
    await clickWebIdViaDom(webId);
  }
}
