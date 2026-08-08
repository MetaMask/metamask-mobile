import { ConfirmationRequestTypeIDs } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import { EncapsulatedElementType } from '../../../framework';

class RequestTypes {
  get PersonalSignRequest(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationRequestTypeIDs.PERSONAL_SIGN_REQUEST,
    );
  }

  get TypedSignRequest(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationRequestTypeIDs.TYPED_SIGN_REQUEST,
    );
  }
}

export default new RequestTypes();
