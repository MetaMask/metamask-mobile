import { LoginViewSelectors } from '../../selectors/wallet/LoginView.selectors';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

class LoginView {
  get container() {
    return Matchers.getElementByID(LoginViewSelectors.CONTAINER);
  }

  get passwordInput() {
    return Matchers.getElementByID(LoginViewSelectors.PASSWORD_INPUT);
  }

  get forgotPasswordButton() {
    return Matchers.getElementByID(LoginViewSelectors.RESET_WALLET);
  }

  get rememberMeSwitch() {
    return Matchers.getElementByID(LoginViewSelectors.REMEMBER_ME_SWITCH);
  }

  async enterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.passwordInput, password);
  }

  async tapForgotPassword() {
    await Gestures.waitAndTap(this.forgotPasswordButton);
  }

  async toggleRememberMeSwitch() {
    await Gestures.waitAndTap(this.rememberMeSwitch);
  }
}

export default new LoginView();
