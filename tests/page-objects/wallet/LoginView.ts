import { LoginViewSelectors } from '../../../app/components/Views/Login/LoginView.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  encapsulated,
  EncapsulatedElementType,
  asPlaywrightElement,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import { OnboardingSelectorText } from '../../../app/components/Views/Onboarding/Onboarding.testIds';

class LoginView {
  get container(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.CONTAINER);
  }

  get passwordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(LoginViewSelectors.PASSWORD_INPUT),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(LoginViewSelectors.PASSWORD_INPUT, {
            exact: true,
          }),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            LoginViewSelectors.PASSWORD_INPUT,
          ),
      },
    });
  }

  get forgotPasswordButton(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.RESET_WALLET);
  }

  get rememberMeSwitch(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.REMEMBER_ME_SWITCH);
  }

  get loginButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(LoginViewSelectors.LOGIN_BUTTON_ID),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          OnboardingSelectorText.UNLOCK_BUTTON,
        ),
    });
  }

  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(LoginViewSelectors.TITLE_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(LoginViewSelectors.LOGIN_BUTTON_ID),
    });
  }

  async enterPassword(password: string): Promise<void> {
    await UnifiedGestures.typeText(this.passwordInput, password, {
      description: 'Password Input',
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
    await UnifiedGestures.waitAndTap(this.loginButton, {
      description: 'Login Button',
    });
  }

  async waitForScreenToDisplay(): Promise<void> {
    await encapsulatedAction({
      appium: async () => {
        const element = await asPlaywrightElement(this.title);
        await element.waitForDisplayed({ timeout: 15000 });
      },
    });
  }
}

export default new LoginView();
