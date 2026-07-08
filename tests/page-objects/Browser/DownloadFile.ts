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
      // saveToFiles presents UIDocumentPickerViewController (export), not a
      // UIActivityViewController with a top-level "Save" action. The picker
      // always exposes Cancel in the navigation bar once it is presented.
      await device.disableSynchronization();
      const cancelButton = element(by.label('Cancel'));
      await waitFor(cancelButton).toExist().withTimeout(20000);
      await cancelButton.tap();
      return;
    }

    // Android: handleWebDownload shows a success alert after MediaStore save.
    await waitFor(element(by.text('Download complete')))
      .toBeVisible()
      .withTimeout(15000);
  }
}

export default new DownloadFile();
