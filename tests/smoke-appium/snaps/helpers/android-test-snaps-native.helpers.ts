import type { Json } from '@metamask/utils';
import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import type { EncapsulatedElementType } from '../../../framework/EncapsulatedElement';
import {
  wrapElement,
  type PlaywrightElement,
} from '../../../framework/PlaywrightAdapter';
import Assertions from '../../../framework/Assertions';
import Gestures from '../../../framework/Gestures';
import Matchers from '../../../framework/Matchers';
import PlaywrightGestures from '../../../framework/PlaywrightGestures';
import { getDriver } from '../../../framework/PlaywrightUtilities';
import Utilities, { sleep, stripJsonKeys } from '../../../framework/Utilities';
import {
  TestSnapInputSelectorWebIDS,
  TestSnapResultSelectorWebIDS,
  TestSnapViewSelectorWebIDS,
} from '../../../selectors/Browser/TestSnaps.selectors';
import { createPlaywrightLogger } from '../../../framework/playwrightLogger';

type ButtonKey = keyof typeof TestSnapViewSelectorWebIDS;
type InputKey = keyof typeof TestSnapInputSelectorWebIDS;
type ResultKey = keyof typeof TestSnapResultSelectorWebIDS;

const logger = createPlaywrightLogger('AndroidTestSnapsNative');

let loggedNativeBridgeMode = false;

export async function logAndroidTestSnapsNativeBridgeOnce(): Promise<void> {
  if (loggedNativeBridgeMode) {
    return;
  }
  loggedNativeBridgeMode = true;

  logger.info(
    'Test Snaps Android bridge: native UiAutomator (resource-id + WebView scroll)',
  );
}

/** Always visible at the top of the test-snaps page (unlike connect buttons further down). */
export const ANDROID_TEST_SNAPS_LOAD_LABEL = 'Test Snaps';

/**
 * Visible button labels for UiScrollable fallbacks when resource-id nodes are
 * virtualized off-screen in the WebView accessibility tree.
 */
const TEST_SNAPS_SCROLL_LABELS: Record<string, string> = {
  connectbip32: 'Connect to BIP-32 Snap',
  'connectclient-status': 'Connect to Client Status Snap',
  connectcronjobs: 'Connect to Cronjobs Snap',
  connectdialogs: 'Connect to Dialogs Snap',
  connecterrors: 'Connect to Errors Snap',
  'connectjson-rpc': 'Connect to JSON-RPC Snap',
  'connectlifecycle-hooks': 'Connect to Lifecycle Hooks Snap',
  connectpreferences: 'Connect to Preferences Snap',
  connectwasm: 'Connect to WebAssembly Snap',
  sendError: 'Send Test to Error Snap',
  sendConfirmationButton: 'Confirmation',
  sendClientStatusTest: 'Submit',
  sendRpc: 'Invoke Snap',
  sendWasmMessage: 'Calculate',
  getPreferences: 'Submit',
};

const SCROLL_ATTEMPTS = 48;
const UI_SCROLL_INTO_VIEW_TIMEOUT_MS = 90_000;
const IN_PLACE_FIND_TIMEOUT_MS = 5_000;

export async function waitForAndroidTestSnapsNativeLoad(): Promise<void> {
  await logAndroidTestSnapsNativeBridgeOnce();
  await Assertions.expectElementToBeVisible(
    Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID),
    {
      description: 'Browser WebView native container',
      timeout: 30_000,
    },
  );
  await Assertions.expectTextDisplayed(ANDROID_TEST_SNAPS_LOAD_LABEL, {
    timeout: 30_000,
  });
}

export async function tapAndroidTestSnapsButton(
  buttonKey: ButtonKey,
): Promise<void> {
  const webId = TestSnapViewSelectorWebIDS[buttonKey];
  const elem = await scrollNativeWebIdIntoView(webId);
  await Gestures.tap(asEncapsulated(elem), {
    elemDescription: `Android native Test Snaps button: ${buttonKey} (${webId})`,
  });
}

export async function fillAndroidTestSnapsInput(
  inputKey: InputKey,
  value: string,
): Promise<void> {
  const webId = TestSnapInputSelectorWebIDS[inputKey];

  // Fill via native UiAutomator node to avoid WebView context issues on CI.
  // Use W3C key actions instead of setValue/mobile:type for compatibility.
  const elem = await scrollNativeWebIdIntoView(webId);
  await elem.click();
  await getDriver().keys(value.split(''));

  await PlaywrightGestures.hideKeyboard().catch(() => undefined);
}

export async function assertAndroidTestSnapsTextContains(
  resultKey: ResultKey,
  expectedMessage: string,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const webId = TestSnapResultSelectorWebIDS[resultKey];
  const normalized = expectedMessage.replace(/^"|"$/g, '');

  await Utilities.executeWithRetry(
    async () => {
      const actualText = await readNativeWebIdText(webId);
      if (!actualText.includes(normalized)) {
        throw new Error(
          `Expected "${webId}" text to contain "${normalized}", got "${actualText}"`,
        );
      }
    },
    {
      timeout: options.timeout ?? 5_000,
      interval: options.interval ?? 100,
      description: `Assert native result "${webId}" contains "${normalized}"`,
    },
  );
}

export async function assertAndroidTestSnapsJsonExcluding(
  resultKey: ResultKey,
  excludedKeys: string[],
  expectedJson: Json,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const webId = TestSnapResultSelectorWebIDS[resultKey];

  await Utilities.executeWithRetry(
    async () => {
      const actualText = await readNativeWebIdText(webId);
      let actualJson: Json;
      try {
        actualJson = JSON.parse(actualText) as Json;
      } catch {
        throw new Error(
          `Failed to parse JSON from native result "${webId}": ${actualText}`,
        );
      }

      await Assertions.checkIfJsonEqual(
        stripJsonKeys(actualJson, excludedKeys),
        stripJsonKeys(expectedJson, excludedKeys),
      );
    },
    {
      timeout: options.timeout ?? 5_000,
      interval: options.interval ?? 100,
      description: `Assert native JSON result "${webId}" excluding ${excludedKeys.join(', ')}`,
    },
  );
}

export async function assertAndroidTestSnapsJson(
  resultKey: ResultKey,
  expectedJson: Json,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const webId = TestSnapResultSelectorWebIDS[resultKey];

  await Utilities.executeWithRetry(
    async () => {
      const actualText = await readNativeWebIdText(webId);
      let actualJson: Json;
      try {
        actualJson = JSON.parse(actualText) as Json;
      } catch {
        throw new Error(
          `Failed to parse JSON from native result "${webId}": ${actualText}`,
        );
      }

      if (
        typeof expectedJson === 'object' &&
        expectedJson !== null &&
        !Array.isArray(expectedJson)
      ) {
        await Assertions.checkIfJsonEqual(actualJson, expectedJson);
        return;
      }

      await Assertions.checkIfJsonEqual(actualJson, expectedJson);
    },
    {
      timeout: options.timeout ?? 5_000,
      interval: options.interval ?? 100,
      description: `Assert native JSON result "${webId}"`,
    },
  );
}

export async function assertAndroidTestSnapsClientStatus(
  expectedStatus: Record<string, Json>,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { clientVersion: expectedClientVersion, ...statusWithoutVersion } =
    expectedStatus;
  const webId = TestSnapResultSelectorWebIDS.clientStatusResultSpan;

  await Utilities.executeWithRetry(
    async () => {
      const actualText = await readNativeWebIdText(webId);
      let actualStatusWithVersion: Record<string, Json>;
      try {
        actualStatusWithVersion = JSON.parse(actualText) as Record<
          string,
          Json
        >;
      } catch {
        throw new Error(
          `Failed to parse JSON from native client status "${webId}": ${actualText}`,
        );
      }

      const { clientVersion: actualClientVersion, ...actualStatus } =
        actualStatusWithVersion;

      await Assertions.checkIfJsonEqual(actualStatus, statusWithoutVersion);

      if (
        typeof expectedClientVersion !== 'string' ||
        typeof actualClientVersion !== 'string' ||
        !actualClientVersion.startsWith(expectedClientVersion)
      ) {
        throw new Error(
          `Client version mismatch: expected prefix "${String(
            expectedClientVersion,
          )}", got "${String(actualClientVersion)}"`,
        );
      }
    },
    {
      timeout: options.timeout ?? 5_000,
      interval: options.interval ?? 100,
      description: `Assert native client status JSON "${webId}"`,
    },
  );
}

async function scrollNativeWebIdIntoView(
  webId: string,
): Promise<PlaywrightElement> {
  // Generous in-place wait: result spans/buttons usually appear in the current
  // viewport (Chromium exposes nodes lazily), and a UiScrollable sweep scans the
  // whole page from the top (~60s) — far costlier than waiting a few seconds here.
  const alreadyVisible = await tryFindNativeWebIdElement(
    webId,
    IN_PLACE_FIND_TIMEOUT_MS,
  );
  if (alreadyVisible) {
    return alreadyVisible;
  }

  const viaUiScrollable = await scrollNativeWebIdIntoViewViaUiScrollable(webId);
  if (viaUiScrollable) {
    return viaUiScrollable;
  }

  return scrollNativeWebIdIntoViewViaScrollGesture(webId);
}

async function readNativeWebIdText(webId: string): Promise<string> {
  const elem = await scrollNativeWebIdIntoView(webId);
  return elem.getText();
}

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

function buildUiScrollableSelectors(webId: string): string[] {
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

    const label = TEST_SNAPS_SCROLL_LABELS[webId];
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
): Promise<PlaywrightElement | null> {
  for (const selector of buildUiScrollableSelectors(webId)) {
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
async function scrollTestSnapsWebViewUp(): Promise<void> {
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

    await scrollTestSnapsWebViewUp();
    await sleep(300);
  }

  throw new Error(
    `Could not scroll native Test Snaps target into view: ${webId}`,
  );
}

function asEncapsulated(elem: PlaywrightElement): EncapsulatedElementType {
  return elem as unknown as EncapsulatedElementType;
}
