import { SigningBottomSheetSelectorsIDs } from '../../selectors/Browser/SigningBottomSheet.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class SigningBottomSheet {
  get signButton(): DetoxElement {
    return Matchers.getElementByID(SigningBottomSheetSelectorsIDs.SIGN_BUTTON);
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByID(
      SigningBottomSheetSelectorsIDs.CANCEL_BUTTON,
    );
  }

  get personalRequest(): DetoxElement {
    return Matchers.getElementByID(
      SigningBottomSheetSelectorsIDs.PERSONAL_REQUEST,
    );
  }

  get typedRequest(): DetoxElement {
    return Matchers.getElementByID(
      SigningBottomSheetSelectorsIDs.TYPED_REQUEST,
    );
  }

  async tapSignButton(): Promise<void> {
    await Gestures.waitAndTap(this.signButton, {
      elemDescription: 'Tap on the sign button',
    });
  }

  async tapCancelButton(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Tap on the cancel button',
    });
  }
}

export default new SigningBottomSheet();
