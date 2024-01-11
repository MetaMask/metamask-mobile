import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { DeleteContactModalSelectorsText } from '../../selectors/Modals/DeleteContactModal.selectors';

class DeleteContactModal {
  get title() {
    return Matchers.getElementByText(
      DeleteContactModalSelectorsText.MODAL_TITLE,
    );
  }

  get deleteButton() {
    return Matchers.getElementByText(
      DeleteContactModalSelectorsText.DELETE_BUTTON,
    );
  }

  get labelDeleteButton() {
    return Matchers.getElementByLabel(
      DeleteContactModalSelectorsText.DELETE_BUTTON,
    );
  }

  async tapDeleteButton() {
    if (device.getPlatform() === 'ios') {
      await Gestures.waitAndTap(this.deleteButton, 1);
    } else {
      await Gestures.waitAndTap(this.labelDeleteButton);
    }
  }
}

export default new DeleteContactModal();
