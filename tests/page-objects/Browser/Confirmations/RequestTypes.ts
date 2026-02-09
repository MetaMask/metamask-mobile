import { ConfirmationRequestTypeIDs } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds.ts';
import Matchers from '../../../framework/Matchers.ts';

class RequestTypes {
  get PersonalSignRequest(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationRequestTypeIDs.PERSONAL_SIGN_REQUEST,
    );
  }

  get TypedSignRequest(): DetoxElement {
    return Matchers.getElementByID(
      ConfirmationRequestTypeIDs.TYPED_SIGN_REQUEST,
    );
  }
}

export default new RequestTypes();
