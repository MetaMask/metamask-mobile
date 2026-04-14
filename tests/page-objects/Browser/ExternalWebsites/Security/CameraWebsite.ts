import Matchers from '../../../../framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../../framework/Assertions';
import { waitFor } from 'detox';

class CameraWebsite {
  async verifyRequestPermissionDialogVisible(): Promise<void> {
    if (device.getPlatform() === 'ios') {
      await waitFor(
        await Matchers.getElementByLabel(
          'Allow "localhost" to use your camera?',
        ),
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
          "//p[@id='status' and contains(text(), 'Camera access granted')]",
        ),
        { timeout: 5000 },
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
          "//p[@id='status' and contains(text(), 'Camera access granted')]",
        ),
        { timeout: 5000 },
      );
    }
  }
}

export default new CameraWebsite();
