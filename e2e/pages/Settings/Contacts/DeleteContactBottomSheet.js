import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';
import { DeleteContactBottomSheetSelectorsText } from '../../../selectors/Settings/Contacts/DeleteContactBottomSheet.selectors';

class DeleteContactBottomSheet {
  get title() {
    return Matchers.getElementByText(
      DeleteContactBottomSheetSelectorsText.MODAL_TITLE,
    );
  }

  get deleteButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByText(
        DeleteContactBottomSheetSelectorsText.DELETE_BUTTON,
          1,
        )
      : Matchers.getElementByLabel(
        DeleteContactBottomSheetSelectorsText.DELETE_BUTTON,
        );
  }

  async tapDeleteButton() {
    await Gestures.waitAndTap(this.deleteButton);
  }
}

export default new DeleteContactBottomSheet();
