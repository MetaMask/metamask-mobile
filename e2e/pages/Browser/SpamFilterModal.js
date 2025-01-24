import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { SpamFilterModalSelectorText } from '../../selectors/Browser/SpamFilterModal.selectors';

class SpamFilterModal {
  get title() {
    return Matchers.getElementByText(SpamFilterModalSelectorText.TITLE);
  }

  get cancelButtonText() {
    return Matchers.getElementByText(SpamFilterModalSelectorText.CANCEL_BUTTON);
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.cancelButtonText);
  }
}

export default new SpamFilterModal();
