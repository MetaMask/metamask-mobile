import { ConfirmationUIType } from '../../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../../framework/PlaywrightMatchers';

class ConfirmationUITypes {
  get ModalConfirmationContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ConfirmationUIType.MODAL),
      appium: () => PlaywrightMatchers.getElementById(ConfirmationUIType.MODAL),
    });
  }

  get FlatConfirmationContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(ConfirmationUIType.FLAT),
      appium: () => PlaywrightMatchers.getElementById(ConfirmationUIType.FLAT),
    });
  }
}

export default new ConfirmationUITypes();
