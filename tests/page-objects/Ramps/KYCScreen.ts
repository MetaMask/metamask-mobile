import { EnterEmailSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/EnterEmail.testIds';
import { OtpCodeSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/OtpCode.testIds';
import { VerifyIdentitySelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/VerifyIdentity.testIds';
import {
  Assertions,
  Gestures,
  Matchers,
  PlatformDetector,
  Utilities,
  type AppiumElement,
} from '../../framework';

const EMAIL_INPUT_IOS_XPATH = `//*[@name='${EnterEmailSelectorsIDs.EMAIL_INPUT}' or contains(@name,'${EnterEmailSelectorsIDs.EMAIL_INPUT}') or contains(@label,'name@domain.com') or contains(@name,'name@domain.com') or contains(@value,'name@domain.com')]`;
const SEND_EMAIL_IOS_XPATH = `//*[@name='${EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON}' or @label='Send email' or @name='Send email']`;

class KYCScreen {
  get verifyIdentityContinueButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(VerifyIdentitySelectorsIDs.CONTINUE_BUTTON);
  }

  get emailInput(): Promise<AppiumElement> {
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByNativeXPath(EMAIL_INPUT_IOS_XPATH);
    }
    return Matchers.getElementByID(EnterEmailSelectorsIDs.EMAIL_INPUT);
  }

  get sendEmailButton(): Promise<AppiumElement> {
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByNativeXPath(SEND_EMAIL_IOS_XPATH);
    }
    return Matchers.getElementByID(EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON);
  }

  get otpScreen(): Promise<AppiumElement> {
    return Matchers.getElementByID(OtpCodeSelectorsIDs.OTP_CODE_SCREEN);
  }

  get otpCodeInput(): Promise<AppiumElement> {
    return Matchers.getElementByID(OtpCodeSelectorsIDs.OTP_CODE_INPUT);
  }

  async enterOtpCode(code: string): Promise<void> {
    if (PlatformDetector.isIOS()) {
      // RN 0.85 Fabric no longer exposes CodeField's hidden internal
      // TextInput (opacity 0.015, which carries the testID) in the XCUITest
      // tree, so the input is unfindable by name. The field auto-focuses
      // with the number pad up — type by tapping keyboard keys instead.
      await Assertions.expectElementToBeVisible(this.otpScreen, {
        timeout: 15000,
        description: 'OTP code screen should be visible',
      });
      await Gestures.typeViaIosKeyboard(code, { numberPad: true });
      return;
    }

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
    // Use tapKeyboardReturnKey (not tapIosKeyboardKey) — iOS return keys are
    // often named "Done:" and need keyboard-scoped locator fallbacks.
    await Gestures.typeText(this.emailInput, email, {
      hideKeyboard: false,
      elemDescription: 'Email input',
    });
    await Gestures.tapKeyboardReturnKey('Done');
  }

  async tapSendEmail(): Promise<void> {
    await Gestures.waitAndTap(this.sendEmailButton, {
      elemDescription: 'Send email button',
    });
  }
}

export default new KYCScreen();
