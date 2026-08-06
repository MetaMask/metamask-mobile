import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../framework/Assertions';
import AndroidWebViewCdpHelpers from '../../../framework/AndroidWebViewCdpHelpers';
import Matchers from '../../../framework/Matchers';
import { createPlaywrightLogger } from '../../../framework/playwrightLogger';
import {
  TEST_SNAPS_ANDROID_SCROLL_LABELS,
  TEST_SNAPS_URL,
  testSnapsAndroidScrollOptions,
} from '../../../selectors/Browser/TestSnaps.selectors';

export { TEST_SNAPS_ANDROID_SCROLL_LABELS, testSnapsAndroidScrollOptions };

const logger = createPlaywrightLogger('AndroidTestSnapsNative');

let loggedNativeBridgeMode = false;

export async function logAndroidTestSnapsNativeBridgeOnce(): Promise<void> {
  if (loggedNativeBridgeMode) {
    return;
  }
  loggedNativeBridgeMode = true;

  logger.info(
    'Test Snaps Android bridge: CDP-first WebView actions with native fallback',
  );
}

/** Always visible at the top of the test-snaps page (unlike connect buttons further down). */
export const ANDROID_TEST_SNAPS_LOAD_LABEL = 'Test Snaps';

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
  // Best-effort: warm verified page WS so fill/tap/scroll are fast.
  await AndroidWebViewCdpHelpers.primePage(TEST_SNAPS_URL);
}
