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
  connectbip44: 'Connect to BIP-44 Snap',
  'connectbackground-events': 'Connect to Background Events Snap',
  'connectclient-status': 'Connect to Client Status Snap',
  connectcronjobs: 'Connect to Cronjobs Snap',
  connectdialogs: 'Connect to Dialogs Snap',
  connecterrors: 'Connect to Errors Snap',
  connectGetEntropySnap: 'Connect to Get Entropy Snap',
  connectgetfile: 'Connect to Get File Snap',
  connectimages: 'Connect to Image Snap',
  'connectinteractive-ui': 'Connect to Interactive UI Snap',
  connectjsx: 'Connect to JSX Snap',
  'connectjson-rpc': 'Connect to JSON-RPC Snap',
  'connectlifecycle-hooks': 'Connect to Lifecycle Hooks Snap',
  'connectmanage-state': 'Connect to Manage State Snap',
  'connectmultichain-provider': 'Connect to Multichain Provider Snap',
  'connectname-lookup': 'Connect to Name Lookup Snap',
  'connectnetwork-access': 'Connect to Network Access Snap',
  'connectethereum-provider': 'Connect to Ethereum Provider Snap',
  connectpreferences: 'Connect to Preferences Snap',
  connectstate: 'Connect to State Snap',
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
