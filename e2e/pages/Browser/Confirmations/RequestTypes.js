import { ConfirmationRequestTypeIDs } from '../../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../../utils/Matchers';

class RequestTypes {
  get PersonalSignRequest() {
    return Matchers.getElementByID(
      ConfirmationRequestTypeIDs.PERSONAL_SIGN_REQUEST,
    );
  }

  get TypedSignRequest() {
    return Matchers.getElementByID(
      ConfirmationRequestTypeIDs.TYPED_SIGN_REQUEST,
    );
  }
}

export default new RequestTypes();
