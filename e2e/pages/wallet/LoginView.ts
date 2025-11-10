import { LoginViewSelectors } from '../../selectors/wallet/LoginView.selectors';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import PlaywrightMatchers from '../../../wdio-playwright/framework/PlaywrightMatchers';
import { PlaywrightElement } from '../../../wdio-playwright/framework/PlaywrightAdapter';

class LoginView {
  get container(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.CONTAINER);
  }

  get passwordInput(): Promise<PlaywrightElement> {
    return PlaywrightMatchers.getByXPath(
      '//*[@resource-id="login-password-input"]',
    );
  }

  get forgotPasswordButton(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.RESET_WALLET);
  }

  get rememberMeSwitch(): DetoxElement {
    return Matchers.getElementByID(LoginViewSelectors.REMEMBER_ME_SWITCH);
  }

  get unlockButton(): Promise<PlaywrightElement> {
    return PlaywrightMatchers.getByText('Unlock');
  }

  async enterPassword(password: string): Promise<void> {
    // Playwright-style API with WebdriverIO's robust element handling!
    await (await this.passwordInput).fill(password + '\n');
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
