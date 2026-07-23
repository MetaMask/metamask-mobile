/* eslint-disable import-x/no-nodejs-modules */
import { BrowserViewSelectorsIDs } from '../../app/components/Views/BrowserTab/BrowserView.testIds';
import type { EncapsulatedElementType } from './EncapsulatedElement';
import { wrapElement, type PlaywrightElement } from './PlaywrightAdapter';
import Gestures from './Gestures';
import { getDriver } from './PlaywrightUtilities';
import PlaywrightGestures from './PlaywrightGestures';
import { sleep } from './Utilities';
import { createPlaywrightLogger } from './playwrightLogger';

const logger = createPlaywrightLogger('AndroidWebViewNative');

const SCROLL_ATTEMPTS = 48;
const UI_SCROLL_INTO_VIEW_TIMEOUT_MS = 90_000;
const IN_PLACE_FIND_TIMEOUT_MS = 5_000;

export interface AndroidWebViewScrollOptions {
  /** Optional visible text labels used when resource-id nodes are virtualized off-screen. */
  scrollLabels?: Record<string, string>;
}

function escapeUiAutomatorString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function asEncapsulated(elem: PlaywrightElement): EncapsulatedElementType {
  return elem as unknown as EncapsulatedElementType;
}

async function findNativeWebIdElement(
  webId: string,
): Promise<PlaywrightElement> {
  const escapedWebId = escapeUiAutomatorString(webId);
  return wrapElement(
    getDriver().$(`android=new UiSelector().resourceId("${escapedWebId}")`),
  );
}

async function tryFindNativeWebIdElement(
  webId: string,
  timeout = 500,
): Promise<PlaywrightElement | null> {
  try {
    const elem = await findNativeWebIdElement(webId);
    await elem.unwrap().waitForExist({ timeout });
    return elem;
  } catch {
    return null;
  }
}

function buildUiScrollableSelectors(
  webId: string,
  scrollLabels: Record<string, string> = {},
): string[] {
  const browserWebViewId = BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID;
  const escapedWebId = escapeUiAutomatorString(webId);
  const scrollableBases = [
    `new UiScrollable(new UiSelector().resourceId("${browserWebViewId}").childSelector(new UiSelector().className("android.webkit.WebView").scrollable(true)))`,
    `new UiScrollable(new UiSelector().resourceId("${browserWebViewId}").childSelector(new UiSelector().className("android.webkit.WebView")))`,
    `new UiScrollable(new UiSelector().resourceId("${browserWebViewId}"))`,
  ];

  const selectors: string[] = [];
  for (const scrollable of scrollableBases) {
    selectors.push(
      `${scrollable}.scrollIntoView(new UiSelector().resourceId("${escapedWebId}"))`,
    );

    const label = scrollLabels[webId];
    if (label) {
      const escapedLabel = escapeUiAutomatorString(label);
      selectors.push(
        `${scrollable}.scrollIntoView(new UiSelector().text("${escapedLabel}"))`,
      );
    }
  }

  return selectors;
}

async function scrollNativeWebIdIntoViewViaUiScrollable(
  webId: string,
  scrollLabels: Record<string, string> = {},
): Promise<PlaywrightElement | null> {
  for (const selector of buildUiScrollableSelectors(webId, scrollLabels)) {
    try {
      const elem = wrapElement(getDriver().$(`android=${selector}`));
      await elem.unwrap().waitForExist({
        timeout: UI_SCROLL_INTO_VIEW_TIMEOUT_MS,
      });
      logger.debug(`UiScrollable located "${webId}"`);
      return elem;
    } catch (error) {
      logger.debug(
        `UiScrollable scrollIntoView failed for ${webId}: ${String(error)}`,
      );
    }
  }

  return null;
}

async function getBrowserWebViewContainer(): Promise<PlaywrightElement> {
  const browserWebViewId = BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID;
  const webView = wrapElement(
    getDriver().$(`android=new UiSelector().resourceId("${browserWebViewId}")`),
  );
  await webView.unwrap().waitForExist({ timeout: 3_000 });
  return webView;
}

/** Scroll up inside the browser WebView. Inner WebView elemIds reject scrollGesture on release builds. */
async function scrollBrowserWebViewUp(): Promise<void> {
  const drv = getDriver();
  const container = await getBrowserWebViewContainer();
  const elementId = await container.unwrap().elementId;

  if (elementId) {
    try {
      await drv.execute('mobile: scrollGesture', {
        elemId: elementId,
        direction: 'up',
        percent: 0.9,
      });
      return;
    } catch (error) {
      logger.debug(
        `scrollGesture by browser-webview elemId failed, using bounds: ${String(error)}`,
      );
    }
  }

  const location = await container.unwrap().getLocation();
  const size = await container.unwrap().getSize();
  await drv.execute('mobile: scrollGesture', {
    left: location.x,
    top: location.y,
    width: size.width,
    height: size.height,
    direction: 'up',
    percent: 0.9,
  });
}

async function scrollNativeWebIdIntoViewViaScrollGesture(
  webId: string,
): Promise<PlaywrightElement> {
  for (let attempt = 0; attempt < SCROLL_ATTEMPTS; attempt += 1) {
    const elem = await tryFindNativeWebIdElement(webId);
    if (elem) {
      return elem;
    }

    await scrollBrowserWebViewUp();
    await sleep(300);
  }

  throw new Error(`Could not scroll native WebView target into view: ${webId}`);
}

/**
 * Scroll an Android WebView accessibility node (resource-id) into view.
 * Prefer this over Chromedriver WebView context on CI where context switching flakes.
 */
export async function scrollAndroidWebIdIntoView(
  webId: string,
  options: AndroidWebViewScrollOptions = {},
): Promise<PlaywrightElement> {
  // Generous in-place wait: nodes often appear in the current viewport, and a
  // UiScrollable sweep from the top is far costlier than waiting a few seconds.
  const alreadyVisible = await tryFindNativeWebIdElement(
    webId,
    IN_PLACE_FIND_TIMEOUT_MS,
  );
  if (alreadyVisible) {
    return alreadyVisible;
  }

  const viaUiScrollable = await scrollNativeWebIdIntoViewViaUiScrollable(
    webId,
    options.scrollLabels,
  );
  if (viaUiScrollable) {
    return viaUiScrollable;
  }

  return scrollNativeWebIdIntoViewViaScrollGesture(webId);
}

export async function tapAndroidWebId(
  webId: string,
  options: AndroidWebViewScrollOptions & { description?: string } = {},
): Promise<void> {
  const elem = await scrollAndroidWebIdIntoView(webId, options);
  await Gestures.tap(asEncapsulated(elem), {
    elemDescription:
      options.description ?? `Android native WebView tap: ${webId}`,
  });
}

/**
 * Fill a WebView input via native UiAutomator (avoids Chromedriver context issues).
 * Uses W3C key actions instead of setValue/mobile:type for compatibility.
 */
export async function fillAndroidWebId(
  webId: string,
  value: string,
  options: AndroidWebViewScrollOptions = {},
): Promise<void> {
  const elem = await scrollAndroidWebIdIntoView(webId, options);
  await elem.click();
  await getDriver().keys(value.split(''));
  await PlaywrightGestures.hideKeyboard().catch(() => undefined);
}

export async function readAndroidWebIdText(
  webId: string,
  options: AndroidWebViewScrollOptions = {},
): Promise<string> {
  const elem = await scrollAndroidWebIdIntoView(webId, options);
  return elem.getText();
}
