import { DetectedTokensSelectorIDs } from '../../selectors/wallet/DetectedTokensView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class DetectedTokensView {
  get importButton() {
    return Matchers.getElementByID(DetectedTokensSelectorIDs.IMPORT_BUTTON_ID);
  }

  async tapImport() {
    //TODO: import button is dynamic and we should use regex to tap button text
    // await Gestures.tapTextBeginingWith('Import');
    await Gestures.tapByText('Import (1)');
  }
}

export default new DetectedTokensView();
