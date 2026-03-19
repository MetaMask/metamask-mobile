import { ChoosePasswordSelectorsIDs } from '../../../app/components/Views/ChoosePassword/ChoosePassword.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import enContent from '../../../locales/languages/en.json';

class CreatePasswordView {
  get container(): DetoxElement {
    return Matchers.getElementByID(ChoosePasswordSelectorsIDs.CONTAINER_ID);
  }

  /**
   * The DS `TextField` places `testID` on the outer Pressable wrapper
   * (not the inner TextInput). These "outer" getters target that Pressable
   * via `by.id()` and are used to tap-to-focus before typing.
   */
  get newPasswordInputOuter(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.NEW_PASSWORD_INPUT_ID,
    );
  }

  get confirmPasswordInputOuter(): DetoxElement {
    return Matchers.getElementByID(
      ChoosePasswordSelectorsIDs.CONFIRM_PASSWORD_INPUT_ID,
    );
  }

  get newPasswordInput(): DetoxElement {
    // The DS `TextField` places `testID` on its outer Pressable wrapper
    // (not the inner TextInput). On Android, Detox's typeText requires
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
    await Gestures.waitAndTap(this.newPasswordInputOuter, {
      elemDescription: 'Create Password New Password Container',
    });
    await Gestures.typeText(this.newPasswordInput, '', {
      hideKeyboard: true,
      checkVisibility: false,
    });
    await Gestures.waitAndTap(this.confirmPasswordInputOuter, {
      elemDescription: 'Create Password Confirm Password Container',
    });
    await Gestures.typeText(this.confirmPasswordInput, '', {
      hideKeyboard: true,
      checkVisibility: false,
    });
  }

  async enterPassword(password: string): Promise<void> {
    // Tap the outer Pressable (by ID) to ensure the inner TextInput is focused.
    // The DS TextField's Pressable has accessible={false}, so its onPress
    // delegates focus to the inner TextInput.
    await Gestures.waitAndTap(this.newPasswordInputOuter, {
      elemDescription: 'Create Password New Password Container',
    });
    // On Android, the inner TextInput found via by.label() may fail Detox's
    // 75%-visible check even when interactable. Skip the visibility assertion
    // and rely on the tap above to confirm the screen is loaded and focused.
    await Gestures.typeText(this.newPasswordInput, password, {
      elemDescription: 'Create Password New Password Input',
      hideKeyboard: false,
      checkVisibility: false,
    });
  }

  async reEnterPassword(password: string): Promise<void> {
    await Gestures.waitAndTap(this.confirmPasswordInputOuter, {
      elemDescription: 'Create Password Confirm Password Container',
    });
    await Gestures.typeText(this.confirmPasswordInput, password, {
      elemDescription: 'Create Password Confirm Password Input',
      hideKeyboard: true,
      checkVisibility: false,
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
