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
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByText(
          DeleteContactModalSelectorsText.DELETE_BUTTON,
          1,
        )
      : Matchers.getElementByLabel(
          DeleteContactModalSelectorsText.DELETE_BUTTON,
        );
  }

  async tapDeleteButton() {
    await Gestures.waitAndTap(this.deleteButton);
  }
}

export default new DeleteContactModal();
