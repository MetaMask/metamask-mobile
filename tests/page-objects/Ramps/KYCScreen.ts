import { EnterEmailSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/EnterEmail.testIds';
import { OtpCodeSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/OtpCode.testIds';
import { VerifyIdentitySelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/VerifyIdentity.testIds';
import {
  Assertions,
  Gestures,
  Matchers,
  PlatformDetector,
  Utilities,
  type EncapsulatedElementType,
} from '../../framework';

const EMAIL_INPUT_IOS_XPATH = `//*[@name='${EnterEmailSelectorsIDs.EMAIL_INPUT}' or contains(@name,'${EnterEmailSelectorsIDs.EMAIL_INPUT}') or contains(@label,'name@domain.com') or contains(@name,'name@domain.com') or contains(@value,'name@domain.com')]`;
const OTP_INPUT_IOS_XPATH = `//*[@name='${OtpCodeSelectorsIDs.OTP_CODE_INPUT}' or contains(@name,'${OtpCodeSelectorsIDs.OTP_CODE_INPUT}')]//XCUIElementTypeTextField | //*[@name='${OtpCodeSelectorsIDs.OTP_CODE_INPUT}' or contains(@name,'${OtpCodeSelectorsIDs.OTP_CODE_INPUT}')]`;
const SEND_EMAIL_IOS_XPATH = `//*[@name='${EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON}' or @label='Send email' or @name='Send email']`;

class KYCScreen {
  get verifyIdentityContinueButton(): EncapsulatedElementType {
    return Matchers.getElementByID(VerifyIdentitySelectorsIDs.CONTINUE_BUTTON);
  }

  get emailInput(): EncapsulatedElementType {
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByNativeXPath(EMAIL_INPUT_IOS_XPATH);
    }
    return Matchers.getElementByID(EnterEmailSelectorsIDs.EMAIL_INPUT);
  }

  get sendEmailButton(): EncapsulatedElementType {
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByNativeXPath(SEND_EMAIL_IOS_XPATH);
    }
    return Matchers.getElementByID(EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON);
  }

  get otpScreen(): EncapsulatedElementType {
    return Matchers.getElementByID(OtpCodeSelectorsIDs.OTP_CODE_SCREEN);
  }

  get otpCodeInput(): EncapsulatedElementType {
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByNativeXPath(OTP_INPUT_IOS_XPATH);
    }
    return Matchers.getElementByID(OtpCodeSelectorsIDs.OTP_CODE_INPUT);
  }

  async enterOtpCode(code: string): Promise<void> {
    await Assertions.expectElementToBeVisible(this.otpCodeInput, {
      timeout: 15000,
      description: 'OTP code input should be visible',
    });
    await Gestures.typeText(this.otpCodeInput, code, {
      checkVisibility: false,
      elemDescription: 'OTP code input in Verify your identity View',
      hideKeyboard: true,
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
    await Assertions.expectElementToBeVisible(this.emailInput, {
      timeout: 15000,
      description: 'Email input should be visible',
    });

    if (PlatformDetector.isAndroid()) {
      // Android RN TextField often ignores ENTER / onSubmitEditing.
      await Gestures.typeText(this.emailInput, email, {
        hideKeyboard: true,
        elemDescription: 'Email input',
      });
      await Gestures.waitAndTap(this.sendEmailButton, {
        elemDescription: 'Send email button after entering email',
      });
      return;
    }

    // iOS: Done fires onSubmitEditing (returnKeyType=done).
    await Gestures.typeText(this.emailInput, email, {
      hideKeyboard: false,
      elemDescription: 'Email input',
    });
    await Gestures.tapIosKeyboardKey('Done');
  }

  async tapSendEmail(): Promise<void> {
    await Gestures.waitAndTap(this.sendEmailButton, {
      elemDescription: 'Send email button',
    });
  }
}

export default new KYCScreen();
