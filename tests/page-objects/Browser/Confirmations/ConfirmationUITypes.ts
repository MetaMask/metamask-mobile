import { ConfirmationUIType } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';

class ConfirmationUITypes {
  get ModalConfirmationContainer(): DetoxElement {
    return Matchers.getElementByID(ConfirmationUIType.MODAL);
  }

  get FlatConfirmationContainer(): DetoxElement {
    return Matchers.getElementByID(ConfirmationUIType.FLAT);
  }
}

export default new ConfirmationUITypes();
