import type { Json } from '@metamask/utils';
import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../framework/Assertions';
import Matchers from '../../../framework/Matchers';
import Utilities, { stripJsonKeys } from '../../../framework/Utilities';
import {
  fillAndroidWebId,
  readAndroidWebIdText,
  tapAndroidWebId,
} from '../../../framework/AndroidWebViewNative';
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

const scrollOptions = { scrollLabels: TEST_SNAPS_SCROLL_LABELS };

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
  await tapAndroidWebId(webId, {
    ...scrollOptions,
    description: `Android native Test Snaps button: ${buttonKey} (${webId})`,
  });
}

export async function fillAndroidTestSnapsInput(
  inputKey: InputKey,
  value: string,
): Promise<void> {
  const webId = TestSnapInputSelectorWebIDS[inputKey];
  await fillAndroidWebId(webId, value, scrollOptions);
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
      const actualText = await readAndroidWebIdText(webId, scrollOptions);
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
      const actualText = await readAndroidWebIdText(webId, scrollOptions);
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
      const actualText = await readAndroidWebIdText(webId, scrollOptions);
      let actualJson: Json;
      try {
        actualJson = JSON.parse(actualText) as Json;
      } catch {
        throw new Error(
          `Failed to parse JSON from native result "${webId}": ${actualText}`,
        );
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
      const actualText = await readAndroidWebIdText(webId, scrollOptions);
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
