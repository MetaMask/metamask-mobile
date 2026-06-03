import { SigningBottomSheetSelectorsIDs } from '../../../app/components/Views/confirmations/legacy/components/SigningBottomSheet.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class SigningBottomSheet {
  get signButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SigningBottomSheetSelectorsIDs.SIGN_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SigningBottomSheetSelectorsIDs.SIGN_BUTTON,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SigningBottomSheetSelectorsIDs.CANCEL_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SigningBottomSheetSelectorsIDs.CANCEL_BUTTON,
        ),
    });
  }

  get personalRequest(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          SigningBottomSheetSelectorsIDs.PERSONAL_REQUEST,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SigningBottomSheetSelectorsIDs.PERSONAL_REQUEST,
        ),
    });
  }

  get typedRequest(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(SigningBottomSheetSelectorsIDs.TYPED_REQUEST),
      appium: () =>
        PlaywrightMatchers.getElementById(
          SigningBottomSheetSelectorsIDs.TYPED_REQUEST,
        ),
    });
  }

  async tapSignButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.signButton, {
      elemDescription: 'Tap on the sign button',
    });
  }

  async tapCancelButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Tap on the cancel button',
    });
  }
}

export default new SigningBottomSheet();
