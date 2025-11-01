import Matchers from '../../framework/Matchers.ts';
import TestHelpers from '../../helpers';
import { waitFor } from 'detox';

class DownloadFile {
  async verifyTapjackingAndClickDownloadButton(): Promise<void> {
    await TestHelpers.delay(1000); // TODO replace with a check that button is disabled and after 500ms is enabled
    const downloadButtonInDialog =
      device.getPlatform() === 'android'
        ? Matchers.getElementByText('Download')
        : Matchers.getElementByLabel('Download');
    await (await downloadButtonInDialog).tap();
  }

  async verifySuccessStateVisible(): Promise<void> {
    if (device.getPlatform() === 'ios') {
      // Verify for iOS that system file saving dialog is visible
      waitFor(await Matchers.getElementByLabel('Save')).toExist();
    } else {
      // Verify for Android that toast after successful downloading is visible
      waitFor(
        await Matchers.getElementByText('Downloaded successfully'),
      ).toExist();
    }
  }
}

export default new DownloadFile();
