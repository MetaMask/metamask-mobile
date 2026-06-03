import Matchers from '../../../framework/Matchers';
import { DeleteContactBottomSheetSelectorsText } from '../../../selectors/Settings/Contacts/DeleteContactBottomSheet.selectors';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class DeleteContactBottomSheet {
  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          DeleteContactBottomSheetSelectorsText.MODAL_TITLE,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          DeleteContactBottomSheetSelectorsText.MODAL_TITLE,
        ),
    });
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
    await UnifiedGestures.waitAndTap(this.deleteButton, {
      elemDescription: 'Delete Button in Delete Contact Bottom Sheet',
    });
  }
}

export default new DeleteContactBottomSheet();
