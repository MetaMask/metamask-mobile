import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import enContent from '../../../locales/languages/en.json';
import {
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightAssertions from '../../framework/PlaywrightAssertions';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class CreatePasswordView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  get newPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        device.getPlatform() === 'ios'
          ? Matchers.getElementByID(
              ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
            )
          : Matchers.getElementByLabel(
              ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
            ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
            {
              exact: true,
            },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            '(//XCUIElementTypeOther[@name="textfield"])[1]',
          ),
      },
    });
  }

  get confirmPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        device.getPlatform() === 'ios'
          ? Matchers.getElementByID(
              ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            )
          : Matchers.getElementByLabel(
              ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            {
              exact: true,
            },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            '(//XCUIElementTypeOther[@name="textfield"])[2]',
          ),
      },
    });
  }

  get newWalletConfirmPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        device.getPlatform() === 'ios'
          ? Matchers.getElementByID(
              ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            )
          : Matchers.getElementByLabel(
              ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            {
              exact: true,
            },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByXPath(
            '//XCUIElementTypeOther[@name="textfield" and @label="create-password-second-input-field"]',
          ),
      },
    });
  }

  get iUnderstandCheckbox(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
          {
            exact: true,
          },
        ),
    });
  }

  get iUnderstandCheckboxNewWallet(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get submitButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID,
          {
            exact: true,
          },
        ),
    });
  }

  get passwordError(): DetoxElement {
    return Matchers.getElementByText(enContent.import_from_seed.password_error);
  }

  async resetPasswordInputs(): Promise<void> {
    await Gestures.typeText(asDetoxElement(this.newPasswordInput), '', {
      hideKeyboard: true,
      clearFirst: true,
      checkVisibility: false,
    });
    await Gestures.typeText(asDetoxElement(this.confirmPasswordInput), '', {
      hideKeyboard: true,
      clearFirst: true,
      checkVisibility: false,
    });
  }

  async enterPassword(password: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(
          asDetoxElement(this.newPasswordInput),
          password,
          {
            elemDescription: 'Create Password New Password Input',
            hideKeyboard: true,
            checkVisibility: false,
            checkEnabled: false,
          },
        );
      },
      appium: async () => {
        await UnifiedGestures.typeText(this.newPasswordInput, password, {
          // once merged, remove me and create a typeText in Playwright Gestures

          description: 'Create Password New Password Input',
        });
      },
    });
  }

  async reEnterPassword(password: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(
          asDetoxElement(this.confirmPasswordInput),
          password,
          {
            elemDescription: 'Create Password Confirm Password Input',
            hideKeyboard: true,
            checkVisibility: false,
            checkEnabled: false,
          },
        );
      },
      appium: async () => {
        await UnifiedGestures.typeText(this.confirmPasswordInput, password, {
          description: 'Create Password Confirm Password Input',
        });
      },
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.tap(asDetoxElement(this.iUnderstandCheckbox), {
          elemDescription: 'Create Password - I Understand Checkbox',
          checkVisibility: false,
        });
      },
      appium: async () => {
        await UnifiedGestures.tap(this.iUnderstandCheckbox, {
          description: 'Create Password - I Understand Checkbox',
        });
      },
    });
  }

  async tapCreatePasswordButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(asDetoxElement(this.submitButton), {
          elemDescription: 'Create Password Submit Button',
          checkVisibility: false,
        });
      },
      appium: async () => {
        await UnifiedGestures.waitAndTap(this.submitButton, {
          description: 'Create Password Submit Button',
        });
      },
    });
  }

  async isVisible(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Assertions.expectElementToBeVisible(
          asDetoxElement(this.newPasswordInput),
          {
            description: 'Create password input should be visible',
          },
        );
      },
      appium: async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          asPlaywrightElement(this.newPasswordInput),
          {
            timeout: 10000,
            description: 'Create password input should be visible',
          },
        );
      },
    });
  }

  async isNewAccountScreenFieldsVisible(): Promise<void> {
    await this.isVisible();
  }

  async inputPasswordInFirstField(password: string): Promise<void> {
    await this.enterPassword(password);
  }

  async inputConfirmPasswordField(password: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(
          asDetoxElement(this.newWalletConfirmPasswordInput),
          password,
          {
            elemDescription: 'Create Password Confirm Password Input',
            hideKeyboard: true,
            checkVisibility: false,
            checkEnabled: false,
          },
        );
      },
      appium: async () => {
        await UnifiedGestures.typeText(
          this.newWalletConfirmPasswordInput,
          password,
          {
            description: 'Create Password Confirm Password Input',
          },
        );
      },
    });
  }
}

export default new CreatePasswordView();
