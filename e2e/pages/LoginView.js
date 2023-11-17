import TestHelpers from '../helpers';
import { LOGIN_WITH_REMEMBER_ME_SWITCH } from '../../wdio/screen-objects/testIDs/Screens/LoginScreen.testIds';
import { RevealSeedViewSelectorsIDs } from '../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import { LoginViewSelectors } from '../selectors/LoginView.selectors';

export default class LoginView {
  static async enterPassword(password) {
    await TestHelpers.typeTextAndHideKeyboard(
      RevealSeedViewSelectorsIDs.PASSWORD_INPUT,
      password,
    );
  }

  static async tapResetWalletButton() {
    await TestHelpers.tap(LoginViewSelectors.RESET_WALLET);
  }

  static async toggleRememberMe() {
    await TestHelpers.tap(LOGIN_WITH_REMEMBER_ME_SWITCH);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(LoginViewSelectors.CONTAINER);
  }
}
