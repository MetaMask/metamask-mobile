import { EnterEmailSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/EnterEmail.testIds';
import { OtpCodeSelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/OtpCode.testIds';
import { VerifyIdentitySelectorsIDs } from '../../../app/components/UI/Ramp/Views/NativeFlow/VerifyIdentity.testIds';
import {
  Gestures,
  Matchers,
  PlatformDetector,
  PlaywrightAssertions,
  PlaywrightGestures,
  PlaywrightMatchers,
  Utilities,
  asPlaywrightElement,
  encapsulated,
  encapsulatedAction,
  type EncapsulatedElementType,
} from '../../framework';

const EMAIL_INPUT_IOS_XPATH = `//*[@name='${EnterEmailSelectorsIDs.EMAIL_INPUT}' or contains(@name,'${EnterEmailSelectorsIDs.EMAIL_INPUT}') or contains(@label,'name@domain.com') or contains(@name,'name@domain.com') or contains(@value,'name@domain.com')]`;
const OTP_INPUT_IOS_XPATH = `//*[@name='${OtpCodeSelectorsIDs.OTP_CODE_INPUT}' or contains(@name,'${OtpCodeSelectorsIDs.OTP_CODE_INPUT}')]//XCUIElementTypeTextField | //*[@name='${OtpCodeSelectorsIDs.OTP_CODE_INPUT}' or contains(@name,'${OtpCodeSelectorsIDs.OTP_CODE_INPUT}')]`;

class KYCScreen {
  get verifyIdentityContinueButton(): EncapsulatedElementType {
    return Matchers.getElementByID(VerifyIdentitySelectorsIDs.CONTINUE_BUTTON);
  }

  get emailInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(EnterEmailSelectorsIDs.EMAIL_INPUT),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            EnterEmailSelectorsIDs.EMAIL_INPUT,
            { exact: true },
          ),
        ios: () => PlaywrightMatchers.getElementByXPath(EMAIL_INPUT_IOS_XPATH),
      },
    });
  }

  get sendEmailButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            `//*[@name='${EnterEmailSelectorsIDs.SEND_EMAIL_BUTTON}' or @label='Send email' or @name='Send email']`,
          ),
      },
    });
  }

  get otpScreen(): EncapsulatedElementType {
    return Matchers.getElementByID(OtpCodeSelectorsIDs.OTP_CODE_SCREEN);
  }

  get otpCodeInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByID(OtpCodeSelectorsIDs.OTP_CODE_INPUT),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            OtpCodeSelectorsIDs.OTP_CODE_INPUT,
            {
              exact: true,
            },
          ),
        ios: () => PlaywrightMatchers.getElementByXPath(OTP_INPUT_IOS_XPATH),
      },
    });
  }

  async enterOtpCode(code: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(this.otpCodeInput, code, {
          checkVisibility: false,
          elemDescription: 'OTP code input in Verify your identity View',
        });
      },
      appium: async () => {
        const otpInput = await asPlaywrightElement(this.otpCodeInput);
        await PlaywrightAssertions.expectElementToBeVisible(otpInput, {
          timeout: 15000,
          description: 'OTP code input should be visible',
        });
        await otpInput.fill(code);
        await PlaywrightGestures.hideKeyboard();
      },
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
    await encapsulatedAction({
      detox: async () => {
        await Utilities.waitForElementToBeEnabled(this.emailInput);
        await Gestures.typeText(this.emailInput, email, {
          hideKeyboard: true,
          elemDescription: 'Email input',
        });
      },
      appium: async () => {
        const emailField = await asPlaywrightElement(this.emailInput);
        await PlaywrightAssertions.expectElementToBeVisible(emailField, {
          timeout: 15000,
          description: 'Email input should be visible',
        });
        await emailField.fill(email);
        if (await PlatformDetector.isAndroid()) {
          // Android RN TextField often ignores ENTER / onSubmitEditing.
          await PlaywrightGestures.hideKeyboard();
          await Gestures.waitAndTap(this.sendEmailButton, {
            elemDescription: 'Send email button after entering email',
          });
        } else {
          // iOS: Done fires onSubmitEditing (returnKeyType=done).
          await PlaywrightGestures.tapKeyboardReturnKey('Done');
        }
      },
    });
  }

  async tapSendEmail(): Promise<void> {
    await Gestures.waitAndTap(this.sendEmailButton, {
      elemDescription: 'Send email button',
    });
  }
}

export default new KYCScreen();
