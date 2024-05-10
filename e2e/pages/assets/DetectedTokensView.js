import { DetectedTokensSelectorIDs } from '../../selectors/assets/DetectedTokensView.selectors';
import Gestures from '../../utils/Gestures';
import Matchers from '../../utils/Matchers';

class DetectedTokensView {
  get importButton() {
    return Matchers.getElementByID(DetectedTokensSelectorIDs.IMPORT_BUTTON_ID);
  }

  async tapImport() {
    await Gestures.waitAndTap(this.importButton);
  }
}

export default new DetectedTokensView();
