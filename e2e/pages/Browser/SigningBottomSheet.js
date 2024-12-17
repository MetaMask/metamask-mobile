import { SigningBottomSheetSelectorsIDs } from '../../selectors/Browser/SigningBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class SigningBottomSheet {
  get signButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(SigningBottomSheetSelectorsIDs.SIGN_BUTTON)
      : Matchers.getElementByID(SigningBottomSheetSelectorsIDs.SIGN_BUTTON);
  }

  get cancelButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(SigningBottomSheetSelectorsIDs.CANCEL_BUTTON)
      : Matchers.getElementByID(SigningBottomSheetSelectorsIDs.CANCEL_BUTTON);
  }

  get personalRequest() {
    return Matchers.getElementByID(SigningBottomSheetSelectorsIDs.PERSONAL_REQUEST);
  }

  get typedRequest() {
    return Matchers.getElementByID(SigningBottomSheetSelectorsIDs.TYPED_REQUEST);
  }

  async tapSignButton() {
    await Gestures.waitAndTap(this.signButton);
  }

  async tapCancelButton() {
    await Gestures.waitAndTap(this.cancelButton);
  }
}

export default new SigningBottomSheet();
