import { LoginViewSelectors } from '../../selectors/wallet/LoginView.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
  FrameworkDetector,
  PlaywrightMatchers,
} from '../../../wdio-playwright/framework';

class LoginView {
  get container(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.CONTAINER);
  }

  get passwordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(LoginViewSelectors.PASSWORD_INPUT),
      appium: () =>
        PlaywrightMatchers.getByXPath(
          `//*[@resource-id="${LoginViewSelectors.PASSWORD_INPUT}"]`,
        ),
    });
  }

  get forgotPasswordButton(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.RESET_WALLET);
  }

  get rememberMeSwitch(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.REMEMBER_ME_SWITCH);
  }

  get unlockButton(): EncapsulatedElementType {
    return encapsulated({
      appium: () => PlaywrightMatchers.getByText('Unlock'),
    });
  }

  async enterPassword(password: string): Promise<void> {
    const input = this.passwordInput;

    if (FrameworkDetector.isDetox()) {
      // Detox: typeText for character-by-character entry
      await Gestures.typeText(input as DetoxElement, password, {
        hideKeyboard: true,
        elemDescription: 'Password Input',
      });
    } else {
      // WebdriverIO: fill with newline to submit
      const elem = await asPlaywrightElement(input);
      await elem.fill(password);
      await (await asPlaywrightElement(this.unlockButton)).click();
    }
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
}

export default new LoginView();
