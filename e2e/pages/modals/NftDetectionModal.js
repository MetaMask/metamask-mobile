import { NftDetectionModalSelectorsIDs } from '../../selectors/Modals/NftDetectionModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class NftDetectionModal {
  get container() {
    return Matchers.getElementByID(NftDetectionModalSelectorsIDs.CONTAINER);
  }

  get cancelButton() {
    return Matchers.getElementByID(NftDetectionModalSelectorsIDs.CANCEL_BUTTON);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new NftDetectionModal();
