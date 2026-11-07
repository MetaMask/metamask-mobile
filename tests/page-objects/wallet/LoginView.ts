import { LoginViewSelectors } from '../../../app/components/Views/Login/LoginView.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import Utilities, { sleep } from '../../framework/Utilities';
import type { AppiumElement } from '../../framework/AppiumElement';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { isWalletHomeReadyOnAppium } from '../../flows/wallet-home-readiness';

const LOGIN_BUTTON_POLL_MS = 300;
const LOGIN_BUTTON_BUDGET_MS = 15_000;

class LoginView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(LoginViewSelectors.CONTAINER);
  }

  get passwordInput(): Promise<AppiumElement> {
    // Android: match the inner EditText via content-desc (UiAutomator).
    // iOS: testID resolves via Matchers.getElementByID.
    if (PlatformDetector.isAndroid()) {
      return Matchers.getElementByAndroidUIAutomator(
        `.description("${LoginViewSelectors.PASSWORD_INPUT}")`,
      );
    }
    return Matchers.getElementByID(LoginViewSelectors.PASSWORD_INPUT);
  }

  get forgotPasswordButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(LoginViewSelectors.RESET_WALLET);
  }

  get rememberMeSwitch(): Promise<AppiumElement> {
    return Matchers.getElementByID(LoginViewSelectors.REMEMBER_ME_SWITCH);
  }

  get loginButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(LoginViewSelectors.LOGIN_BUTTON_ID);
  }

  get title(): Promise<AppiumElement> {
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
    // Dismissing the keyboard can also submit the password field, and iOS
    // hideKeyboard(tapOutside) can land on Unlock itself. Poll for wallet
    // home readiness before requiring a displayed login button.
    await Gestures.hideKeyboard();

    const deadline = Date.now() + LOGIN_BUTTON_BUDGET_MS;
    while (Date.now() < deadline) {
      if (await isWalletHomeReadyOnAppium()) {
        return;
      }

      if (await Utilities.isElementVisible(this.loginButton, 500)) {
        await Gestures.waitAndTap(this.loginButton, {
          elemDescription: 'Login Button',
          checkForDisplayed: true,
          checkEnabled: true,
          // Heads-up / glass footer chrome can fail the interactive probe
          // even when a plain tap unlocks — same posture as MM Connect unlock.
          waitForInteractive: false,
          timeout: Math.min(5_000, Math.max(1_000, deadline - Date.now())),
        });
        return;
      }

      await sleep(LOGIN_BUTTON_POLL_MS);
    }

    if (await isWalletHomeReadyOnAppium()) {
      return;
    }

    // Final attempt: FooterGlass Unlock may exist while isDisplayed is false.
    await Gestures.waitAndTap(this.loginButton, {
      elemDescription: 'Login Button',
      checkForDisplayed: false,
      checkEnabled: false,
      waitForInteractive: false,
      timeout: 5_000,
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
