import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { PlatformDetector } from '../../framework/PlatformLocator';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class DownloadFile {
  async verifyTapjackingAndClickDownloadButton(): Promise<void> {
    if (!PlatformDetector.isAndroid()) {
      // iOS blob/data downloads skip confirmation and open Save to Files directly.
      return;
    }

    await PlaywrightContextHelpers.switchToNativeContext();
    // RN Alert.alert positive button is the system Dialog button1 resource-id.
    // Text matchers miss it once the native dialog steals the accessibility tree.
    const confirmDownloadButton =
      await PlaywrightMatchers.getElementById('android:id/button1');
    await PlaywrightGestures.waitAndTap(confirmDownloadButton, {
      timeout: 15_000,
    });
  }

  async verifySuccessStateVisible(): Promise<void> {
    await PlaywrightContextHelpers.switchToNativeContext();

    if (PlatformDetector.isIOS()) {
      // saveToFiles presents UIDocumentPickerViewController (export), not a
      // UIActivityViewController with a top-level "Save" action. Cancel appears
      // in the hierarchy but is not hittable, so only assert presentation.
      const cancel =
        await PlaywrightMatchers.getElementByAccessibilityId('Cancel');
      await cancel.unwrap().waitForExist({ timeout: 20_000 });
      return;
    }

    // Android: handleWebDownload shows a success alert after MediaStore save.
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByText('Download complete'),
      {
        timeout: 15_000,
        description: 'Android download complete alert',
      },
    );
  }
}

export default new DownloadFile();
