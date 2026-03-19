import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import enContent from '../../../locales/languages/en.json';

class CreatePasswordView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  get newPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      // Use getElementByLabel so Detox targets the inner TextInput (EditText on
      // Android) rather than the outer Pressable container which carries the
      // testID but has no input connection and therefore rejects typeText.
      detox: () =>
        Matchers.getElementByLabel(
          ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
        ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
          ),
      },
    });
  }

  get confirmPasswordInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByLabel(
          ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
        ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
          ),
      },
    });
  }

  get iUnderstandCheckbox(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get iUnderstandCheckboxNewWallet(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.I_UNDERSTAND_CHECKBOX_ID,
    );
  }

  get submitButton(): DetoxElement {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.SUBMIT_BUTTON_ID);
  }

  get passwordError(): DetoxElement {
    return Matchers.getElementByText(enContent.import_from_seed.password_error);
  }

  async resetPasswordInputs(): Promise<void> {
    await UnifiedGestures.typeText(this.newPasswordInput, '', {
      description: 'Create Password New Password Input',
    });
    await UnifiedGestures.typeText(this.confirmPasswordInput, '', {
      description: 'Create Password Confirm Password Input',
    });
  }

  async enterPassword(password: string): Promise<void> {
    await UnifiedGestures.typeText(this.newPasswordInput, password, {
      description: 'Create Password New Password Input',
    });
  }

  async reEnterPassword(password: string): Promise<void> {
    await UnifiedGestures.typeText(this.confirmPasswordInput, password, {
      description: 'Create Password Confirm Password Input',
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await Gestures.tap(this.iUnderstandCheckbox, {
      elemDescription: 'Create Password - I Understand Checkbox',
      checkVisibility: false,
    });
  }

  async tapCreatePasswordButton(): Promise<void> {
    await Gestures.waitAndTap(this.submitButton, {
      elemDescription: 'Create Password Submit Button',
      checkVisibility: false,
    });
  }
}

export default new CreatePasswordView();
