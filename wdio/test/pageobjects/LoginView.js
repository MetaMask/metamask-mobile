import TestHelpers from '../helpers';
import {
  PASSWORD_INPUT_BOX_ID,
  RESET_WALLET_ID,
  LOGIN_CONTAINER_ID,
  LOGIN_PASSWORD_ERROR,
} from '../../app/constants/test-ids';
export default class LoginView {
  static async enterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(PASSWORD_INPUT_BOX_ID, password);
  }
  static async tapResetWalletButton() {
    await TestHelpers.tap(RESET_WALLET_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(LOGIN_CONTAINER_ID);
  }
  static async isLoginErrorVisible() {
    await TestHelpers.checkIfVisible(LOGIN_PASSWORD_ERROR);
  }
}
