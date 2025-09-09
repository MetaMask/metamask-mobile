import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { DeleteContactBottomSheetSelectorsText } from '../../../selectors/Settings/Contacts/DeleteContactBottomSheet.selectors';

class DeleteContactBottomSheet {
  get title(): DetoxElement {
    return Matchers.getElementByText(
      DeleteContactBottomSheetSelectorsText.MODAL_TITLE,
    );
  }

  get deleteButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByText(
          DeleteContactBottomSheetSelectorsText.DELETE_BUTTON,
          1,
        )
      : Matchers.getElementByLabel(
          DeleteContactBottomSheetSelectorsText.DELETE_BUTTON,
        );
  }

  async tapDeleteButton(): Promise<void> {
    await Gestures.waitAndTap(this.deleteButton, {
      elemDescription: 'Delete Button in Delete Contact Bottom Sheet',
    });
  }
}

export default new DeleteContactBottomSheet();
