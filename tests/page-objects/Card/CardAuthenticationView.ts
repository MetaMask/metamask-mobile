import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { CardAuthenticationSelectors } from '../../../app/components/UI/Card/Views/CardAuthentication/CardAuthentication.testIds';
import { EncapsulatedElementType } from '../../framework';

class CardAuthenticationView {
  get emailField(): EncapsulatedElementType {
    return Matchers.getElementByID(CardAuthenticationSelectors.EMAIL_FIELD);
  }

  get passwordField(): EncapsulatedElementType {
    return Matchers.getElementByID(CardAuthenticationSelectors.PASSWORD_FIELD);
  }

  get loginButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
    );
  }

  get signupButton(): EncapsulatedElementType {
    return Matchers.getElementByID(CardAuthenticationSelectors.SIGNUP_BUTTON);
  }

  async enterEmail(email: string): Promise<void> {
    await Gestures.typeText(this.emailField, email, {
      elemDescription: 'Card Auth Email Field',
      hideKeyboard: false,
    });
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.passwordField, password, {
      elemDescription: 'Card Auth Password Field',
      hideKeyboard: true,
    });
  }

  async tapLoginButton(): Promise<void> {
    await Gestures.waitAndTap(this.loginButton, {
      elemDescription: 'Card Auth Login Button',
    });
  }

  async login(email: string, password: string): Promise<void> {
    await this.enterEmail(email);
    await this.enterPassword(password);
    await this.tapLoginButton();
  }
}

export default new CardAuthenticationView();
