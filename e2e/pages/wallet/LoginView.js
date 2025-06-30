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

  get resetWalletButton() {
    return Matchers.getElementByID(LoginViewSelectors.RESET_WALLET);
  }

  get rememberMeSwitch() {
    return Matchers.getElementByID(LoginViewSelectors.REMEMBER_ME_SWITCH);
  }

  async enterPassword(password) {
    await Gestures.typeText(this.passwordInput, password, {
      hideKeyboard: true,
      elemDescription: 'Password Input',
    });
  }

  async tapResetWalletButton() {
    await Gestures.waitAndTap(this.resetWalletButton, {
      elemDescription: 'Reset Wallet Button',
    });
  }

  async toggleRememberMeSwitch() {
    await Gestures.waitAndTap(this.rememberMeSwitch, {
      elemDescription: 'Remember Me Switch',
    });
  }
}

export default new LoginView();
