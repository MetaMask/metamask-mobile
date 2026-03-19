import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import enContent from '../../../locales/languages/en.json';

class CreatePasswordView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  get newPasswordInput(): DetoxElement {
    // `TextField` from the design system places `testID` on its outer Pressable
    // wrapper (not the inner TextInput). On Android, Detox's typeText requires
    // an android.widget.EditText. Using `accessibilityLabel` (forwarded via
    // ...props to the inner Input) and `by.label()` targets the actual EditText.
    // The Pressable has `accessible={false}` so it is skipped by label matchers.
    return Matchers.getElementByLabel(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInput(): DetoxElement {
    // Same rationale as newPasswordInput — uses accessibilityLabel (forwarded to
    // the inner Input) to target the actual EditText on Android.
    return Matchers.getElementByLabel(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
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
    await Gestures.typeText(this.newPasswordInput, '', {
      hideKeyboard: true,
    });
    await Gestures.typeText(this.confirmPasswordInput, '', {
      hideKeyboard: true,
    });
  }

  async enterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.newPasswordInput, password, {
      elemDescription: 'Create Password New Password Input',
      hideKeyboard: true,
    });
  }

  async reEnterPassword(password: string): Promise<void> {
    await Gestures.typeText(this.confirmPasswordInput, password, {
      elemDescription: 'Create Password Confirm Password Input',
      hideKeyboard: true,
    });
  }

  async tapIUnderstandCheckBox(): Promise<void> {
    await Gestures.tap(this.iUnderstandCheckbox, {
      elemDescription: 'Create Password - I Understand Checkbox',
    });
  }

  async tapCreatePasswordButton(): Promise<void> {
    await Gestures.waitAndTap(this.submitButton, {
      elemDescription: 'Create Password Submit Button',
    });
  }
}

export default new CreatePasswordView();
