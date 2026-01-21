import { LoginViewSelectors } from '../../../app/components/Views/Login/LoginView.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class LoginView {
  get container(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.CONTAINER);
  }

  get passwordInput(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.PASSWORD_INPUT);
  }

  get forgotPasswordButton(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.RESET_WALLET);
  }

  get rememberMeSwitch(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.REMEMBER_ME_SWITCH);
  }

  get loginButton(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.LOGIN_BUTTON_ID);
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.passwordInput, password, {
      hideKeyboard: true,
      elemDescription: 'Password Input',
    });
  }

  async tapForgotPassword(): Promise<void> {
    await Gestures.waitAndTap(this.forgotPasswordButton, {
      elemDescription: 'Forgot Password Button',
    });
  }

  async toggleRememberMeSwitch(): Promise<void> {
    await Gestures.waitAndTap(this.rememberMeSwitch, {
      elemDescription: 'Remember Me Switch',
    });
  }

  async tapUnlock(): Promise<void> {
    await Gestures.waitAndTap(this.loginButton, {
      elemDescription: 'Login/Unlock Button',
    });
  }
}

export default new LoginView();
