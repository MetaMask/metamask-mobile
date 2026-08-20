import { SigningBottomSheetSelectorsIDs } from '../../../app/components/Views/confirmations/legacy/components/SigningBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework';

class SigningBottomSheet {
  get signButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SigningBottomSheetSelectorsIDs.SIGN_BUTTON);
  }

  get cancelButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SigningBottomSheetSelectorsIDs.CANCEL_BUTTON,
    );
  }

  get personalRequest(): EncapsulatedElementType {
    return Matchers.getElementByID(
      SigningBottomSheetSelectorsIDs.PERSONAL_REQUEST,
    );
  }

  get typedRequest(): EncapsulatedElementType {
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
