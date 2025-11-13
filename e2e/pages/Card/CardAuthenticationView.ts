import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { CardAuthenticationSelectors } from '../../selectors/Card/CardAuthentication.selectors';

class CardAuthenticationView {
  get verifyAccountButton(): DetoxElement {
    return Matchers.getElementByID(
      CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON,
    );
  }

  get signupButton(): DetoxElement {
    return Matchers.getElementByID(CardAuthenticationSelectors.SIGNUP_BUTTON);
  }

  get welcomeToCardTitleText(): DetoxElement {
    return Matchers.getElementByID(
      CardAuthenticationSelectors.WELCOME_TO_CARD_TITLE_TEXT,
    );
  }

  get welcomeToCardDescriptionText(): DetoxElement {
    return Matchers.getElementByID(
      CardAuthenticationSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT,
    );
  }

  get foxImage(): DetoxElement {
    return Matchers.getElementByID(CardAuthenticationSelectors.FOX_IMAGE);
  }

  get emailInput(): DetoxElement {
    return Matchers.getElementByID(CardAuthenticationSelectors.EMAIL_INPUT);
  }

  get passwordInput(): DetoxElement {
    return Matchers.getElementByID(CardAuthenticationSelectors.PASSWORD_INPUT);
  }

  async tapVerifyAccountButton(): Promise<void> {
    await Gestures.waitAndTap(this.verifyAccountButton, {
      elemDescription: 'Verify Account Button in Card Authentication View',
    });
  }

  async tapSignupButton(): Promise<void> {
    await Gestures.waitAndTap(this.signupButton, {
      elemDescription: 'Signup Button in Card Authentication View',
    });
  }

  async enterEmail(email: string): Promise<void> {
    await Gestures.typeText(this.emailInput, email, {
      elemDescription: 'Email Input in Card Authentication View',
    });
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.passwordInput, password, {
      elemDescription: 'Password Input in Card Authentication View',
    });
  }
}

export default new CardAuthenticationView();
