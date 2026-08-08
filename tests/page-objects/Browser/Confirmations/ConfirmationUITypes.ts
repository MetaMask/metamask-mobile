import { ConfirmationUIType } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import { EncapsulatedElementType } from '../../../framework';

class ConfirmationUITypes {
  get ModalConfirmationContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationUIType.MODAL);
  }

  get FlatConfirmationContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(ConfirmationUIType.FLAT);
  }
}

export default new ConfirmationUITypes();
