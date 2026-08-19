import { LoginViewSelectors } from '../../../app/components/Views/Login/LoginView.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { PlatformDetector } from '../../framework/PlatformLocator';

class LoginView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(LoginViewSelectors.CONTAINER);
  }

  get passwordInput(): EncapsulatedElementType {
    // Android: match the inner EditText via content-desc (UiAutomator).
    // iOS: testID resolves via Matchers.getElementByID.
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByAndroidUIAutomator(
        `.description("${LoginViewSelectors.PASSWORD_INPUT}")`,
      );
    }
    return Matchers.getElementByID(LoginViewSelectors.PASSWORD_INPUT);
  }

  get forgotPasswordButton(): EncapsulatedElementType {
    return Matchers.getElementByID(LoginViewSelectors.RESET_WALLET);
  }

  get rememberMeSwitch(): EncapsulatedElementType {
    return Matchers.getElementByID(LoginViewSelectors.REMEMBER_ME_SWITCH);
  }

  get loginButton(): EncapsulatedElementType {
    return Matchers.getElementByID(LoginViewSelectors.LOGIN_BUTTON_ID);
  }

  get title(): EncapsulatedElementType {
    return Matchers.getElementByID(LoginViewSelectors.TITLE_ID);
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.passwordInput, password, {
      elemDescription: 'Password Input',
      hideKeyboard: false,
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

  async tapLoginButton(): Promise<void> {
    await Gestures.waitAndTap(this.loginButton, {
      elemDescription: 'Login Button',
      checkForDisplayed: true,
      checkEnabled: true,
      waitForInteractive: true,
      timeout: 10_000,
    });
  }

  async waitForScreenToDisplay(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.title, {
      timeout: 15000,
      description: 'Login title should be visible',
    });
  }
}

export default new LoginView();
