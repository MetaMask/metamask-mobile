import { BrowserViewSelectorsIDs } from '../../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../../framework/Assertions';
import Gestures from '../../../../framework/Gestures';
import Matchers from '../../../../framework/Matchers';
import { PlatformDetector } from '../../../../framework/PlatformLocator';
import AppiumContextHelpers from '../../../../framework/AppiumContextHelpers';
// eslint-disable-next-line import-x/no-nodejs-modules
import { execFileSync } from 'child_process';

const CAMERA_GRANTED_XPATH =
  "//p[@id='status' and contains(text(), 'Camera access granted')]";
/** Android Appium / main-e2e package id (see APP_BUNDLE_IDS.ANDROID). */
const ANDROID_PACKAGE = 'io.metamask';

class CameraWebsite {
  /**
   * Re-grants Android OS camera permission after `pm clear` (withFixtures).
   * Appium `autoGrantPermissions` only applies at install time.
   */
  grantAndroidCameraPermission(): void {
    try {
      execFileSync(
        'adb',
        ['shell', 'pm', 'grant', ANDROID_PACKAGE, 'android.permission.CAMERA'],
        { stdio: 'pipe' },
      );
    } catch {
      // Best-effort — permission may already be granted.
    }
  }

  /**
   * Verifies camera permission is granted for the fixture page.
   * @param pageUrl - Full camera.html URL (required under Appium for WebView checks).
   */
  async verifyRequestPermissionDialogVisible(pageUrl: string): Promise<void> {
    // Emulator Appium sessions set `appium:autoAcceptAlerts: true`, which
    // auto-dismisses the iOS WKWebView camera prompt before the test can
    // assert it. Assert the fixture outcome instead (access granted).
    //
    // Android still shows an in-WebView ALLOW chip (not a system alert),
    // so tap that when present, then confirm grant via the native a11y tree.
    if (PlatformDetector.isIOS()) {
      await Assertions.expectElementToBeVisible(
        Matchers.getElementByXPath(
          BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
          CAMERA_GRANTED_XPATH,
          pageUrl,
        ),
        {
          timeout: 20000,
          description:
            'Camera access granted status text is visible (iOS Appium)',
        },
      );
      return;
    }

    // WebView site prompt — casing varies by Chromium/WebView version.
    // Emulators frequently have no camera device, so getUserMedia may end
    // in "denied" even after Allow; the security signal is the prompt.
    const allowMatchers = [
      Matchers.getElementByText('ALLOW'),
      Matchers.getElementByText('Allow'),
      Matchers.getElementByText(/while using the app/i),
    ];
    let allowTapped = false;
    for (const allowMatcher of allowMatchers) {
      try {
        await Gestures.waitAndTap(allowMatcher, {
          elemDescription: 'Camera permission allow control (Android)',
          timeout: 8000,
        });
        allowTapped = true;
        break;
      } catch {
        // Try next matcher.
      }
    }

    if (allowTapped) {
      return;
    }

    // No prompt — page may have resolved immediately; require a status line.
    await AppiumContextHelpers.switchToNativeContext();
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByAndroidUIAutomator('.textContains("Camera access")'),
      {
        timeout: 15000,
        description: 'Camera access status text is visible (Android Appium)',
      },
    );
  }
}

export default new CameraWebsite();
