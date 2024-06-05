import {
  DetectedTokensSelectorIDs,
  DetectedTokensSelectorTexts,
} from '../../selectors/wallet/DetectedTokensView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class DetectedTokensView {
  get importButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(DetectedTokensSelectorIDs.IMPORT_BUTTON_ID)
      : Matchers.getElementByLabel(DetectedTokensSelectorIDs.IMPORT_BUTTON_ID);
  }

  async tapImport() {
    //TODO: import button is dynamic and we should use regex to tap button text
    // await Gestures.tapTextBeginingWith('Import');
    await Gestures.waitAndTap(this.importButton);
  }
}

export default new DetectedTokensView();
