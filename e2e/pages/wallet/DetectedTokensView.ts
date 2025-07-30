import { DetectedTokensSelectorIDs } from '../../selectors/wallet/DetectedTokensView.selectors';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class DetectedTokensView {
  get importButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(DetectedTokensSelectorIDs.IMPORT_BUTTON_ID)
      : Matchers.getElementByLabel(DetectedTokensSelectorIDs.IMPORT_BUTTON_ID);
  }

  async tapImport(): Promise<void> {
    await Gestures.waitAndTap(this.importButton, {
      elemDescription: 'Import Button in Detected Tokens View',
    });
  }
}

export default new DetectedTokensView();
