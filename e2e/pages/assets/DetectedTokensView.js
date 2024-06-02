import TestHelpers from '../../helpers';
import { DetectedTokensSelectorIDs } from '../../selectors/assets/DetectedTokensView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class DetectedTokensView {
  get importButton() {
    return Matchers.getElementByID(DetectedTokensSelectorIDs.IMPORT_BUTTON_ID);
  }

  async tapImport() {
    //TODO: import button is dynamic and we should use regex to tap button text
    // await Gestures.tapTextBeginingWith('Import');
    await TestHelpers.tapByText('Import (1)');
  }
}

export default new DetectedTokensView();
