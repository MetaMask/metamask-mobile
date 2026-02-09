import { ConfirmationUIType } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds.ts';
import Matchers from '../../../framework/Matchers.ts';

class ConfirmationUITypes {
  get ModalConfirmationContainer(): DetoxElement {
    return Matchers.getElementByID(ConfirmationUIType.MODAL);
  }

  get FlatConfirmationContainer(): DetoxElement {
    return Matchers.getElementByID(ConfirmationUIType.FLAT);
  }
}

export default new ConfirmationUITypes();
