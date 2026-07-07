import { waitFor } from 'detox';

class DownloadFile {
  async verifyTapjackingAndClickDownloadButton(): Promise<void> {
    if (device.getPlatform() !== 'android') {
      // iOS blob/data downloads skip confirmation and open Save to Files directly.
      return;
    }

    const downloadButton = element(by.text('Download'));
    await waitFor(downloadButton).toBeVisible().withTimeout(15000);
    await downloadButton.tap();
  }

  async verifySuccessStateVisible(): Promise<void> {
    if (device.getPlatform() === 'ios') {
      await waitFor(element(by.label('Save')))
        .toExist()
        .withTimeout(15000);
      return;
    }

    // Android: handleWebDownload shows a success alert after MediaStore save.
    await waitFor(element(by.text('Download complete')))
      .toBeVisible()
      .withTimeout(15000);
  }
}

export default new DownloadFile();
