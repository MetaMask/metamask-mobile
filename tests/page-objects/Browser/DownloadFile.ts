import Matchers from '../../framework/Matchers';
import TestHelpers from '../../helpers';
import { waitFor } from 'detox';

class DownloadFile {
  async verifyTapjackingAndClickDownloadButton(): Promise<void> {
    await TestHelpers.delay(1000); // TODO replace with a check that button is disabled and after 500ms is enabled
    const downloadButtonInDialog =
      device.getPlatform() === 'android'
        ? Matchers.getElementByText('Download')
        : Matchers.getElementByLabel('Download');
    await ((await downloadButtonInDialog) as Detox.NativeElement).tap();
  }

  async verifySuccessStateVisible(): Promise<void> {
    if (device.getPlatform() === 'ios') {
      // Verify for iOS that system file saving dialog is visible
      waitFor(
        (await Matchers.getElementByLabel('Save')) as Detox.NativeElement,
      ).toExist();
    } else {
      // Verify for Android that toast after successful downloading is visible
      waitFor(
        (await Matchers.getElementByText(
          'Downloaded successfully',
        )) as Detox.NativeElement,
      ).toExist();
    }
  }
}

export default new DownloadFile();
