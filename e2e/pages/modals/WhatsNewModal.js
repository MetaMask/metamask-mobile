import { WhatsNewModalSelectorsIDs } from '../../selectors/Modals/WhatsNewModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class WhatsNewModal {
  get container() {
    return Matchers.getElementByID(WhatsNewModalSelectorsIDs.CONTAINER);
  }

  get closeButton() {
    return Matchers.getElementByID(WhatsNewModalSelectorsIDs.CLOSE_BUTTON);
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeButton);
  }
}

export default new WhatsNewModal();
