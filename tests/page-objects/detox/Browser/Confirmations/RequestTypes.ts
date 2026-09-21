import { ConfirmationRequestTypeIDs } from '../../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../../framework/detox/Matchers';
import { type EncapsulatedElementType } from '../../../../framework/EncapsulatedElement';

/**
 * Detox-native page object for the confirmation request-type containers.
 *
 * Detox-world twin of the Appium
 * `tests/page-objects/Browser/Confirmations/RequestTypes.ts`.
 */
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

  get TransactionConfirmation(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ConfirmationRequestTypeIDs.TRANSACTION_REQUEST,
    );
  }
}

export default new RequestTypes();
