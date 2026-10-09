import { ConfirmationUIType } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import { type AppiumElement } from '../../../framework';

class ConfirmationUITypes {
  get ModalConfirmationContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationUIType.MODAL);
  }

  get FlatConfirmationContainer(): Promise<AppiumElement> {
    return Matchers.getElementByID(ConfirmationUIType.FLAT);
  }
}

export default new ConfirmationUITypes();
