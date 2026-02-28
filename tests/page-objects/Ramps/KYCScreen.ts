import { EnterEmailSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/EnterEmail.testIds';
import { OtpCodeSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/OtpCode.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class KYCScreen {
  get emailInput(): DetoxElement {
    return Matchers.getElementByID(EnterEmailSelectorsIDs.EMAIL_INPUT);
  }

  get sendEmailButton(): DetoxElement {
    return Matchers.getElementByID(EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON);
  }

  async enterEmail(email: string): Promise<void> {
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
}

export default new KYCScreen();
