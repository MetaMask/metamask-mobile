import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { DeleteContactBottomSheetSelectorsText } from '../../../selectors/Settings/Contacts/DeleteContactBottomSheet.selectors';
import { type AppiumElement } from '../../../framework';
import { PlatformDetector } from '../../../framework/PlatformLocator';

class DeleteContactBottomSheet {
  get title(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      DeleteContactBottomSheetSelectorsText.MODAL_TITLE,
    );
  }

  get deleteButton(): Promise<AppiumElement> {
    return PlatformDetector.isIOS()
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
