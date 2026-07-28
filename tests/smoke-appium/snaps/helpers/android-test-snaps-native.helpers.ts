import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../framework/Assertions';
import Matchers from '../../../framework/Matchers';
import { createPlaywrightLogger } from '../../../framework/playwrightLogger';

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
export const TEST_SNAPS_ANDROID_SCROLL_LABELS: Record<string, string> = {
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

export const testSnapsAndroidScrollOptions = {
  scrollLabels: TEST_SNAPS_ANDROID_SCROLL_LABELS,
};

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
