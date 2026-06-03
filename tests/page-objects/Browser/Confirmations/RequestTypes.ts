import { ConfirmationRequestTypeIDs } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';

class RequestTypes {
  get PersonalSignRequest(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ConfirmationRequestTypeIDs.PERSONAL_SIGN_REQUEST,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRequestTypeIDs.PERSONAL_SIGN_REQUEST,
        ),
    });
  }

  get TypedSignRequest(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ConfirmationRequestTypeIDs.TYPED_SIGN_REQUEST),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ConfirmationRequestTypeIDs.TYPED_SIGN_REQUEST,
        ),
    });
  }
}

export default new RequestTypes();
