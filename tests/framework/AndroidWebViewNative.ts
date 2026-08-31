/* eslint-disable import-x/no-nodejs-modules */
import { BrowserViewSelectorsIDs } from '../../app/components/Views/BrowserTab/BrowserView.testIds';
import AndroidWebViewCdpHelpers, {
  isAndroidWebViewCdpEnabled,
} from './AndroidWebViewCdpHelpers';
import Gestures from './Gestures';
import Matchers from './Matchers';
import { wrapElement, type PlaywrightElement } from './PlaywrightAdapter';
import PlaywrightContextHelpers from './PlaywrightContextHelpers';
import { getDriver } from './PlaywrightUtilities';
import PlaywrightGestures from './PlaywrightGestures';
import Utilities, { sleep } from './Utilities';
import { createPlaywrightLogger } from './playwrightLogger';

const logger = createPlaywrightLogger('AndroidWebViewNative');

const SCROLL_ATTEMPTS = 24;
const UI_SCROLL_INTO_VIEW_TIMEOUT_MS = 30_000;
const IN_PLACE_FIND_TIMEOUT_MS = 5_000;

export interface AndroidWebViewScrollOptions {
  /** Optional visible text labels used when resource-id nodes are virtualized off-screen. */
  scrollLabels?: Record<string, string>;
  /**
   * Page URL for CDP scroll target selection (Android Appium).
   * When set and CDP is enabled, scroll tries DOM scrollIntoView before UiScrollable.
   */
  pageUrl?: string;
}

export type AndroidWebViewTapOptions = AndroidWebViewScrollOptions & {
  description?: string;
  timeout?: number;
};

/** Fill/read share scroll options; Android Appium never uses WebView DOM context. */
export type AndroidWebViewFillOptions = AndroidWebViewScrollOptions;
export type AndroidWebViewReadOptions = AndroidWebViewScrollOptions;

function escapeUiAutomatorString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
 * Always switches to NATIVE_APP first so UiAutomator works even if a prior step
 * left the session in a WEBVIEW context.
 */
export async function scrollAndroidWebIdIntoView(
  webId: string,
  options: AndroidWebViewScrollOptions = {},
): Promise<PlaywrightElement> {
  await PlaywrightContextHelpers.switchToNativeContext();

  // Generous in-place wait: nodes often appear in the current viewport, and a
  // UiScrollable sweep from the top is far costlier than waiting a few seconds.
  const alreadyVisible = await tryFindNativeWebIdElement(
    webId,
    IN_PLACE_FIND_TIMEOUT_MS,
  );
  if (alreadyVisible) {
    return alreadyVisible;
  }

  // Prefer CDP DOM scroll when pageUrl is known — avoids slow UiScrollable sweeps.
  // Never uses Chromedriver; failures fall through to native scroll.
  if (options.pageUrl && isAndroidWebViewCdpEnabled()) {
    const cdpScrolled =
      await AndroidWebViewCdpHelpers.scrollElementByIdIntoView(webId, {
        pageUrl: options.pageUrl,
      });
    if (cdpScrolled) {
      const afterCdp = await tryFindNativeWebIdElement(
        webId,
        IN_PLACE_FIND_TIMEOUT_MS,
      );
      if (afterCdp) {
        return afterCdp;
      }
      logger.debug(
        `CDP scrolled #${webId} but resource-id still missing; falling back to UiScrollable`,
      );
    }
  }

  const viaUiScrollable = await scrollNativeWebIdIntoViewViaUiScrollable(
    webId,
    options.scrollLabels,
  );
  if (viaUiScrollable) {
    // Text-label fallback may match a nearby unique anchor (not the target
    // resource-id). Re-resolve by id now that the section should be materialized.
    // If id is still missing, fall through to gesture scroll instead of
    // returning the anchor (which would tap/fill the wrong control).
    const byId = await tryFindNativeWebIdElement(
      webId,
      IN_PLACE_FIND_TIMEOUT_MS,
    );
    if (byId) {
      return byId;
    }
  }

  return scrollNativeWebIdIntoViewViaScrollGesture(webId);
}

export async function tapAndroidWebId(
  webId: string,
  options: AndroidWebViewTapOptions = {},
): Promise<void> {
  logger.debug(options.description ?? `Android native WebView tap: ${webId}`);

  if (options.pageUrl && isAndroidWebViewCdpEnabled()) {
    const cdpTapped = await AndroidWebViewCdpHelpers.tapElementById(webId, {
      pageUrl: options.pageUrl,
    });
    if (cdpTapped) {
      return;
    }
  }

  // Re-find until enabled so we don't hold a stale disabled node across React re-renders.
  let elem!: PlaywrightElement;
  await Utilities.waitUntil(
    async () => {
      elem = await scrollAndroidWebIdIntoView(webId, options);
      return elem.isEnabled();
    },
    { timeout: options.timeout ?? 30_000, interval: 250 },
  );

  await PlaywrightGestures.waitAndTap(elem);
}

/** Type into focused field one character at a time, clearing leftover text first. */
async function typeAndroidKeysSequentially(
  value: string,
  residualText = '',
): Promise<void> {
  const BACKSPACE_KEY = '\uE003';
  const MIN_BACKSPACE_COUNT = 24;
  // Clear leftover characters and size backspace burst to residual text length
  const backspaceCount = Math.max(MIN_BACKSPACE_COUNT, residualText.length + 4);
  await getDriver().keys(BACKSPACE_KEY.repeat(backspaceCount));
  for (const char of value) {
    await getDriver().keys(char);
  }
}

/** Fill a WebView input via native focus + real key events. */
export async function fillAndroidWebId(
  webId: string,
  value: string,
  options: AndroidWebViewFillOptions = {},
): Promise<void> {
  if (options.pageUrl && isAndroidWebViewCdpEnabled()) {
    const cdpFilled = await AndroidWebViewCdpHelpers.fillElementById(
      webId,
      value,
      { pageUrl: options.pageUrl },
    );
    if (cdpFilled) {
      await PlaywrightGestures.hideKeyboard().catch(() => undefined);
      return;
    }
  }

  const elem = await scrollAndroidWebIdIntoView(webId, options);
  await elem.click();
  await elem.clear().catch((error) => {
    logger.debug(
      `clear() failed for WebView input "${webId}", continuing with keys: ${String(error)}`,
    );
  });
  const residualText = await elem.getText().catch(() => '');
  await typeAndroidKeysSequentially(value, residualText);
  await PlaywrightGestures.hideKeyboard().catch(() => undefined);
}

export async function readAndroidWebIdText(
  webId: string,
  options: AndroidWebViewReadOptions = {},
): Promise<string> {
  if (options.pageUrl && isAndroidWebViewCdpEnabled()) {
    const cdpText = await AndroidWebViewCdpHelpers.readElementTextById(webId, {
      pageUrl: options.pageUrl,
    });
    if (cdpText !== undefined) {
      return cdpText;
    }
  }

  const elem = await scrollAndroidWebIdIntoView(webId, options);
  return elem.getText();
}

export async function selectAndroidWebId(
  webId: string,
  optionText: string,
  options: AndroidWebViewTapOptions = {},
): Promise<void> {
  if (options.pageUrl && isAndroidWebViewCdpEnabled()) {
    const cdpSelected = await AndroidWebViewCdpHelpers.selectOptionById(
      webId,
      optionText,
      { pageUrl: options.pageUrl },
    );
    if (cdpSelected) {
      return;
    }
  }

  await tapAndroidWebId(webId, {
    ...options,
    timeout: options.timeout ?? 60_000,
    description: options.description ?? `WebView select open "${webId}"`,
  });
  await Gestures.waitAndTap(Matchers.getElementByText(optionText), {
    elemDescription: `WebView select option "${optionText}"`,
    timeout: 30_000,
  });
}

export async function blurAndroidWebView(pageUrl: string): Promise<void> {
  if (pageUrl && isAndroidWebViewCdpEnabled()) {
    await AndroidWebViewCdpHelpers.blurActiveElement(pageUrl);
  }
  await PlaywrightGestures.hideKeyboard().catch(() => undefined);
}
