import { EnterEmailSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/EnterEmail.testIds';
import { OtpCodeSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/OtpCode.testIds';
import { VerifyIdentitySelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/VerifyIdentity.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { Utilities } from '../../framework';
class KYCScreen {
  get verifyIdentityContinueButton(): DetoxElement {
    return Matchers.getElementByID(VerifyIdentitySelectorsIDs.CONTINUE_BUTTON);
  }

  get emailInput(): DetoxElement {
    return Matchers.getElementByID(EnterEmailSelectorsIDs.EMAIL_INPUT);
  }

  get sendEmailButton(): DetoxElement {
    return Matchers.getElementByID(EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON);
  }

  get otpScreen(): DetoxElement {
    return Matchers.getElementByID(OtpCodeSelectorsIDs.OTP_CODE_SCREEN);
  }

  get otpCodeInput(): DetoxElement {
    return Matchers.getElementByID(OtpCodeSelectorsIDs.OTP_CODE_INPUT);
  }

  async enterOtpCode(code: string): Promise<void> {
    await Gestures.typeText(this.otpCodeInput, code, {
      checkVisibility: false,
      elemDescription: 'OTP code input in Verify your identity View',
    });
  }
  async tapVerifyIdentityContinueButton(): Promise<void> {
    await Utilities.waitForElementToBeEnabled(
      this.verifyIdentityContinueButton,
    );

    await Gestures.waitAndTap(this.verifyIdentityContinueButton, {
      elemDescription: 'Verify Identity continue button',
    });
  }

  async enterEmail(email: string): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.emailInput);

    await Gestures.typeText(this.emailInput, email, {
      hideKeyboard: true,
      elemDescription: 'Email input',
    });
  }

  async tapSendEmail(): Promise<void> {
    await Gestures.waitAndTap(this.sendEmailButton, {
      elemDescription: 'Send email button',
    });
  }
}

export default new KYCScreen();
