import TestHelpers from '../../helpers';
import {
  SIGNATURE_MODAL_CANCEL_BUTTON_ID,
  SIGNATURE_MODAL_ETH_ID,
  SIGNATURE_MODAL_PERSONAL_ID,
  SIGNATURE_MODAL_SIGN_BUTTON_ID,
  SIGNATURE_MODAL_TYPED_ID,
} from '../../../app/constants/test-ids';

export default class SigningModal {
  static async tapSignButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(SIGNATURE_MODAL_SIGN_BUTTON_ID);
    } else {
      await TestHelpers.waitAndTap(SIGNATURE_MODAL_SIGN_BUTTON_ID);
    }
  }

  static async tapCancelButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(SIGNATURE_MODAL_CANCEL_BUTTON_ID);
    } else {
      await TestHelpers.waitAndTap(SIGNATURE_MODAL_CANCEL_BUTTON_ID);
    }
  }

  static async isEthRequestVisible() {
    await TestHelpers.checkIfVisible(SIGNATURE_MODAL_ETH_ID);
  }

  static async isPersonalRequestVisible() {
    await TestHelpers.checkIfVisible(SIGNATURE_MODAL_PERSONAL_ID);
  }

  static async isTypedRequestVisible() {
    await TestHelpers.checkIfVisible(SIGNATURE_MODAL_TYPED_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(SIGNATURE_MODAL_ETH_ID);
    await TestHelpers.checkIfNotVisible(SIGNATURE_MODAL_PERSONAL_ID);
    await TestHelpers.checkIfNotVisible(SIGNATURE_MODAL_TYPED_ID);
  }
}
