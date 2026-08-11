import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { PlatformDetector } from '../../framework/PlatformLocator';
import PlaywrightContextHelpers from '../../framework/PlaywrightContextHelpers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import Utilities from '../../framework/Utilities';
import {
  DownloadFileSelectorsAccessibilityIDs,
  DownloadFileSelectorsIDs,
  DownloadFileSelectorsText,
} from '../../selectors/Browser/DownloadFile.selectors';

class DownloadFile {
  async verifyTapjackingAndClickDownloadButton(): Promise<void> {
    if (!PlatformDetector.isAndroid()) {
      // iOS blob/data downloads skip confirmation and open Save to Files directly.
      return;
    }

    await PlaywrightContextHelpers.switchToNativeContext();
    await PlaywrightGestures.waitAndTap(
      await PlaywrightMatchers.getElementById(
        DownloadFileSelectorsIDs.ANDROID_CONFIRM_DOWNLOAD_BUTTON,
      ),
    );
  }

  async verifySuccessStateVisible(): Promise<void> {
    await PlaywrightContextHelpers.switchToNativeContext();

    if (PlatformDetector.isIOS()) {
      // saveToFiles presents UIDocumentPickerViewController (export), not a
      // UIActivityViewController with a top-level "Save" action. Cancel appears
      // in the hierarchy but is not hittable, so only assert presentation.
      await Utilities.executeWithRetry(
        async () => {
          const cancel = await PlaywrightMatchers.getElementByAccessibilityId(
            DownloadFileSelectorsAccessibilityIDs.IOS_SAVE_SHEET_CANCEL,
          );
          if (!(await cancel.unwrap().isExisting())) {
            throw new Error(
              'iOS download Save sheet Cancel control not present',
            );
          }
        },
        {
          description: 'Assert iOS download Save sheet is presented',
        },
      );
      return;
    }

    // Android: handleWebDownload shows a success alert after MediaStore save.
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByText(
        DownloadFileSelectorsText.ANDROID_DOWNLOAD_COMPLETE,
      ),
      {
        description: 'Android download complete alert',
      },
    );
  }
}

export default new DownloadFile();
