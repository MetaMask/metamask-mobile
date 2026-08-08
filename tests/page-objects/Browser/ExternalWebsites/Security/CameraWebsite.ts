import Matchers from '../../../../framework/Matchers';
import Gestures from '../../../../framework/Gestures';
import { BrowserViewSelectorsIDs } from '../../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../../framework/Assertions';
import PlaywrightAssertions from '../../../../framework/PlaywrightAssertions';
import PlaywrightContextHelpers from '../../../../framework/PlaywrightContextHelpers';
import PlaywrightMatchers from '../../../../framework/PlaywrightMatchers';
import PlaywrightWebMatchers from '../../../../framework/PlaywrightWebMatchers';
import { encapsulatedAction } from '../../../../framework/encapsulatedAction';
import { PlatformDetector } from '../../../../framework/PlatformLocator';
import { waitFor } from 'detox';
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
  async verifyRequestPermissionDialogVisible(pageUrl?: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        if (device.getPlatform() === 'ios') {
          await waitFor(
            (await Matchers.getElementByLabel(
              'Allow "localhost" to use your camera?',
            )) as Detox.NativeElement,
          ).toExist();
          // The WKWebView permission prompt is part of the app view hierarchy,
          // not a system alert. Multiple elements may match "Allow", so pick
          // the first visible one (the dialog button on top).
          const allowButton = element(by.label('Allow')).atIndex(0);
          await allowButton.tap();
          await device.disableSynchronization();
          await Assertions.expectElementToBeVisible(
            Matchers.getElementByXPath(
              BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
              CAMERA_GRANTED_XPATH,
            ),
            {
              timeout: 5000,
              description: 'Camera access granted status text is visible (iOS)',
            },
          );
        } else {
          // On Android, the WebView shows its own permission dialog.
          // Verify it appears, tap ALLOW, then confirm camera access succeeded.
          // OS-level camera permission is pre-granted via withFixtures.
          const allowButton = element(by.text('ALLOW'));
          await waitFor(allowButton).toBeVisible().withTimeout(10000);
          await allowButton.tap();
          // After tapping ALLOW the camera stream starts, keeping the app
          // perpetually "busy" for Detox. Disable sync so assertions don't hang.
          await device.disableSynchronization();
          await Assertions.expectElementToBeVisible(
            Matchers.getElementByXPath(
              BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
              CAMERA_GRANTED_XPATH,
            ),
            {
              timeout: 5000,
              description:
                'Camera access granted status text is visible (Android)',
            },
          );
        }
      },
      appium: async () => {
        if (!pageUrl) {
          throw new Error(
            'pageUrl is required for CameraWebsite.verifyRequestPermissionDialogVisible under Appium',
          );
        }

        // Emulator Appium sessions set `appium:autoAcceptAlerts: true`, which
        // auto-dismisses the iOS WKWebView camera prompt before the test can
        // assert it. Assert the fixture outcome instead (access granted).
        //
        // Android still shows an in-WebView ALLOW chip (not a system alert),
        // so tap that when present, then confirm grant via the native a11y tree.
        if (PlatformDetector.isIOS()) {
          await PlaywrightWebMatchers.withWebViewAction(pageUrl, async () => {
            await PlaywrightAssertions.expectElementToBeVisible(
              PlaywrightWebMatchers.getElementByXPath(
                CAMERA_GRANTED_XPATH,
                pageUrl,
              ),
              {
                timeout: 20000,
                description:
                  'Camera access granted status text is visible (iOS Appium)',
              },
            );
          });
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
        await PlaywrightContextHelpers.switchToNativeContext();
        await PlaywrightAssertions.expectElementToBeVisible(
          PlaywrightMatchers.getElementByAndroidUIAutomator(
            '.textContains("Camera access")',
          ),
          {
            timeout: 15000,
            description:
              'Camera access status text is visible (Android Appium)',
          },
        );
      },
    });
  }
}

export default new CameraWebsite();
