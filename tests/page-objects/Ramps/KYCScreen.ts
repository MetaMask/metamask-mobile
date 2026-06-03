import { EnterEmailSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/EnterEmail.testIds';
import { OtpCodeSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/OtpCode.testIds';
import { VerifyIdentitySelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/VerifyIdentity.testIds';
import Matchers from '../../framework/Matchers';
import { Utilities } from '../../framework';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
class KYCScreen {
  get verifyIdentityContinueButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(VerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          VerifyIdentitySelectorsIDs.CONTINUE_BUTTON,
        ),
    });
  }

  get emailInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(EnterEmailSelectorsIDs.EMAIL_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(EnterEmailSelectorsIDs.EMAIL_INPUT),
    });
  }

  get sendEmailButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON,
        ),
    });
  }

  get otpScreen(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(OtpCodeSelectorsIDs.OTP_CODE_SCREEN),
      appium: () =>
        PlaywrightMatchers.getElementById(OtpCodeSelectorsIDs.OTP_CODE_SCREEN),
    });
  }

  get otpCodeInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(OtpCodeSelectorsIDs.OTP_CODE_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(OtpCodeSelectorsIDs.OTP_CODE_INPUT),
    });
  }

  async enterOtpCode(code: string): Promise<void> {
    await UnifiedGestures.typeText(this.otpCodeInput, code, {
      checkVisibility: false,
      elemDescription: 'OTP code input in Verify your identity View',
    });
  }
  async tapVerifyIdentityContinueButton(): Promise<void> {
    await Utilities.waitForElementToBeEnabled(
      this.verifyIdentityContinueButton,
    );

    await UnifiedGestures.waitAndTap(this.verifyIdentityContinueButton, {
      elemDescription: 'Verify Identity continue button',
    });
  }

  async enterEmail(email: string): Promise<void> {
    await Utilities.waitForElementToBeEnabled(this.emailInput);

    await UnifiedGestures.typeText(this.emailInput, email, {
      hideKeyboard: true,
      elemDescription: 'Email input',
    });
  }

  async tapSendEmail(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.sendEmailButton, {
      elemDescription: 'Send email button',
    });
  }
}

export default new KYCScreen();
